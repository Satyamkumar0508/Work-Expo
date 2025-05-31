from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import MongoClient
import jwt
import bcrypt
from pydantic import BaseModel, Field, EmailStr
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Village Jobs API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["village_jobs"]

# Collections
users_collection = db["users"]
jobs_collection = db["jobs"]
applications_collection = db["applications"]
notifications_collection = db["notifications"]

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Helper function to convert ObjectId to string
def serialize_id(obj):
    if "_id" in obj:
        obj["id"] = str(obj["_id"])
        del obj["_id"]
    return obj

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserBase(BaseModel):
    name: str
    email: EmailStr
    userType: str
    location: str
    bio: str
    skills: Optional[List[str]] = []
    rating: float = 0.0
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    createdAt: datetime

class JobBase(BaseModel):
    title: str
    description: str
    location: str
    category: str
    requiredSkills: List[str]
    payment: str
    duration: str

class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: str
    providerId: str
    providerName: str
    status: str = "open"
    createdAt: datetime
    applicants: int = 0
    assignedTo: Optional[str] = None
    completedAt: Optional[datetime] = None

class ApplicationBase(BaseModel):
    jobId: str
    seekerId: str
    seekerName: str

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationResponse(ApplicationBase):
    id: str
    status: str = "pending"
    appliedAt: datetime
    seekerProfile: dict
    feedback: Optional[dict] = None

class NotificationBase(BaseModel):
    userId: str
    type: str
    title: str
    message: str

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: str
    read: bool = False
    timestamp: datetime

# Authentication functions
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

def authenticate_user(email: str, password: str):
    user = users_collection.find_one({"email": email})
    if not user:
        return False
    if not verify_password(password, user["password"]):
        return False
    return serialize_id(user)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except jwt.PyJWTError:
        raise credentials_exception
    user = users_collection.find_one({"email": token_data.email})
    if user is None:
        raise credentials_exception
    return serialize_id(user)

# Routes
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    # Check if user already exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    user_dict["createdAt"] = datetime.utcnow()
    
    # Insert into database
    result = users_collection.insert_one(user_dict)
    
    # Return user without password
    created_user = users_collection.find_one({"_id": result.inserted_id})
    return serialize_id(created_user)

@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.put("/users/me", response_model=UserResponse)
async def update_user(
    user_update: UserBase,
    current_user: dict = Depends(get_current_user)
):
    # Update user
    user_dict = user_update.dict(exclude_unset=True)
    users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": user_dict}
    )
    
    # Return updated user
    updated_user = users_collection.find_one({"_id": ObjectId(current_user["id"])})
    return serialize_id(updated_user)

@app.post("/jobs", response_model=JobResponse)
async def create_job(
    job: JobCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if user is a provider
    if current_user["userType"] != "provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only job providers can create jobs"
        )
    
    # Create job
    job_dict = job.dict()
    job_dict["providerId"] = current_user["id"]
    job_dict["providerName"] = current_user["name"]
    job_dict["status"] = "open"
    job_dict["createdAt"] = datetime.utcnow()
    job_dict["applicants"] = 0
    
    # Insert into database
    result = jobs_collection.insert_one(job_dict)
    
    # Create notifications for matching job seekers
    matching_users = users_collection.find({
        "userType": "seeker",
        "skills": {"$in": job.requiredSkills}
    })
    
    for user in matching_users:
        notification = {
            "userId": str(user["_id"]),
            "type": "new-matching-job",
            "title": "New Job Match",
            "message": f"A new job matching your skills has been posted: {job.title}",
            "read": False,
            "timestamp": datetime.utcnow()
        }
        notifications_collection.insert_one(notification)
    
    # Return created job
    created_job = jobs_collection.find_one({"_id": result.inserted_id})
    return serialize_id(created_job)

@app.get("/jobs", response_model=List[JobResponse])
async def get_jobs(
    status: Optional[str] = None,
    location: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Build query
    query = {}
    if status:
        query["status"] = status
    if location:
        query["location"] = location
    if category:
        query["category"] = category
    
    # Get jobs
    jobs = list(jobs_collection.find(query))
    return [serialize_id(job) for job in jobs]

@app.get("/jobs/provider", response_model=List[JobResponse])
async def get_provider_jobs(
    current_user: dict = Depends(get_current_user)
):
    # Check if user is a provider
    if current_user["userType"] != "provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only job providers can access this endpoint"
        )
    
    # Get jobs
    jobs = list(jobs_collection.find({"providerId": current_user["id"]}))
    return [serialize_id(job) for job in jobs]

@app.get("/jobs/matching", response_model=List[JobResponse])
async def get_matching_jobs(
    current_user: dict = Depends(get_current_user)
):
    # Check if user is a seeker
    if current_user["userType"] != "seeker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only job seekers can access this endpoint"
        )
    
    # Get matching jobs
    jobs = list(jobs_collection.find({
        "status": "open",
        "requiredSkills": {"$in": current_user["skills"]}
    }))
    return [serialize_id(job) for job in jobs]

@app.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Get job
    job = jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    return serialize_id(job)

@app.post("/applications", response_model=ApplicationResponse)
async def create_application(
    application: ApplicationCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if user is a seeker
    if current_user["userType"] != "seeker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only job seekers can apply for jobs"
        )
    
    # Check if job exists and is open
    job = jobs_collection.find_one({"_id": ObjectId(application.jobId)})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    if job["status"] != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is not open for applications"
        )
    
    # Check if already applied
    existing_application = applications_collection.find_one({
        "jobId": application.jobId,
        "seekerId": current_user["id"]
    })
    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied for this job"
        )
    
    # Create application
    application_dict = application.dict()
    application_dict["seekerId"] = current_user["id"]
    application_dict["seekerName"] = current_user["name"]
    application_dict["status"] = "pending"
    application_dict["appliedAt"] = datetime.utcnow()
    application_dict["seekerProfile"] = {
        "skills": current_user["skills"],
        "rating": current_user["rating"],
        "experience": current_user.get("bio", "")
    }
    
    # Insert into database
    result = applications_collection.insert_one(application_dict)
    
    # Update job applicants count
    jobs_collection.update_one(
        {"_id": ObjectId(application.jobId)},
        {"$inc": {"applicants": 1}}
    )
    
    # Create notification for job provider
    notification = {
        "userId": job["providerId"],
        "type": "new-application",
        "title": "New Application",
        "message": f"{current_user['name']} has applied for your job: {job['title']}",
        "read": False,
        "timestamp": datetime.utcnow()
    }
    notifications_collection.insert_one(notification)
    
    # Return created application
    created_application = applications_collection.find_one({"_id": result.inserted_id})
    return serialize_id(created_application)

@app.get("/applications/job/{job_id}", response_model=List[ApplicationResponse])
async def get_job_applications(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Check if job exists and user is the provider
    job = jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    if job["providerId"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view applications for your own jobs"
        )
    
    # Get applications
    applications = list(applications_collection.find({"jobId": job_id}))
    return [serialize_id(application) for application in applications]

@app.get("/applications/seeker", response_model=List[ApplicationResponse])
async def get_seeker_applications(
    current_user: dict = Depends(get_current_user)
):
    # Check if user is a seeker
    if current_user["userType"] != "seeker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only job seekers can access this endpoint"
        )
    
    # Get applications
    applications = list(applications_collection.find({"seekerId": current_user["id"]}))
    return [serialize_id(application) for application in applications]

@app.put("/applications/{application_id}/select", response_model=ApplicationResponse)
async def select_applicant(
    application_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Check if user is a provider
    if current_user["userType"] != "provider":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only job providers can select applicants"
        )
    
    # Check if application exists
    application = applications_collection.find_one({"_id": ObjectId(application_id)})
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check if job exists and user is the provider
    job = jobs_collection.find_one({"_id": ObjectId(application["jobId"])})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    if job["providerId"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only select applicants for your own jobs"
        )
    
    # Update application status
    applications_collection.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": {"status": "selected"}}
    )
    
    # Reject other applications
    applications_collection.update_many(
        {
            "jobId": application["jobId"],
            "_id": {"$ne": ObjectId(application_id)}
        },
        {"$set": {"status": "rejected"}}
    )
    
    # Update job status
    jobs_collection.update_one(
        {"_id": ObjectId(application["jobId"])},
        {
            "$set": {
                "status": "assigned",
                "assignedTo": application["seekerId"]
            }
        }
    )
    
    # Create notification for selected seeker
    notification = {
        "userId": application["seekerId"],
        "type": "job-selected",
        "title": "Job Offer",
        "message": f"You've been selected for the job: {job['title']}",
        "read": False,
        "timestamp": datetime.utcnow()
    }
    notifications_collection.insert_one(notification)
    
    # Return updated application
    updated_application = applications_collection.find_one({"_id": ObjectId(application_id)})
    return serialize_id(updated_application)

class JobCompletionRequest(BaseModel):
    rating: int
    feedback: str

@app.put("/jobs/{job_id}/complete", response_model=JobResponse)
async def complete_job(
    job_id: str,
    completion: JobCompletionRequest,
    current_user: dict = Depends(get_current_user)
):
    # Check if job exists
    job = jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check if user is the provider or the assigned seeker
    if job["providerId"] != current_user["id"] and job["assignedTo"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only complete your own jobs or jobs assigned to you"
        )
    
    # Check if job is assigned
    if job["status"] != "assigned":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only assigned jobs can be completed"
        )
    
    # Update job status
    jobs_collection.update_one(
        {"_id": ObjectId(job_id)},
        {
            "$set": {
                "status": "completed",
                "completedAt": datetime.utcnow()
            }
        }
    )
    
    # Find the selected application
    application = applications_collection.find_one({
        "jobId": job_id,
        "status": "selected"
    })
    
    if application:
        # Update application with feedback
        applications_collection.update_one(
            {"_id": application["_id"]},
            {
                "$set": {
                    "feedback": {
                        "rating": completion.rating,
                        "comment": completion.feedback
                    }
                }
            }
        )
        
        # Create notification with feedback
        if current_user["userType"] == "provider":
            # Provider completing, notify seeker
            notification = {
                "userId": job["assignedTo"],
                "type": "job-feedback",
                "title": "Job Feedback",
                "message": f"You received a {completion.rating}-star rating for the job: {job['title']}. Feedback: {completion.feedback}",
                "read": False,
                "timestamp": datetime.utcnow()
            }
            notifications_collection.insert_one(notification)
            
            # Update seeker's rating
            seeker = users_collection.find_one({"_id": ObjectId(job["assignedTo"])})
            if seeker:
                # Calculate new average rating
                seeker_applications = list(applications_collection.find({
                    "seekerId": job["assignedTo"],
                    "feedback": {"$exists": True}
                }))
                
                total_ratings = sum(app["feedback"]["rating"] for app in seeker_applications if "feedback" in app)
                new_rating = total_ratings / len(seeker_applications)
                
                users_collection.update_one(
                    {"_id": ObjectId(job["assignedTo"])},
                    {"$set": {"rating": new_rating}}
                )
        else:
            # Seeker completing, notify provider
            notification = {
                "userId": job["providerId"],
                "type": "job-feedback",
                "title": "Job Feedback",
                "message": f"You received a {completion.rating}-star rating for the job: {job['title']}. Feedback: {completion.feedback}",
                "read": False,
                "timestamp": datetime.utcnow()
            }
            notifications_collection.insert_one(notification)
            
            # Update provider's rating
            provider = users_collection.find_one({"_id": ObjectId(job["providerId"])})
            if provider:
                # Calculate new average rating
                provider_jobs = list(jobs_collection.find({
                    "providerId": job["providerId"],
                    "status": "completed"
                }))
                
                provider_applications = list(applications_collection.find({
                    "jobId": {"$in": [str(j["_id"]) for j in provider_jobs]},
                    "feedback": {"$exists": True}
                }))
                
                if provider_applications:
                    total_ratings = sum(app["feedback"]["rating"] for app in provider_applications if "feedback" in app)
                    new_rating = total_ratings / len(provider_applications)
                    
                    users_collection.update_one(
                        {"_id": ObjectId(job["providerId"])},
                        {"$set": {"rating": new_rating}}
                    )
    
    # Return updated job
    updated_job = jobs_collection.find_one({"_id": ObjectId(job_id)})
    return serialize_id(updated_job)

@app.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: dict = Depends(get_current_user)
):
    # Get notifications
    notifications = list(notifications_collection.find({"userId": current_user["id"]}))
    return [serialize_id(notification) for notification in notifications]

@app.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Check if notification exists and belongs to user
    notification = notifications_collection.find_one({"_id": ObjectId(notification_id)})
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    if notification["userId"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only mark your own notifications as read"
        )
    
    # Mark notification as read
    notifications_collection.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"read": True}}
    )
    
    return {"message": "Notification marked as read"}

@app.put("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    # Mark all notifications as read
    notifications_collection.update_many(
        {"userId": current_user["id"]},
        {"$set": {"read": True}}
    )
    
    return {"message": "All notifications marked as read"}

# Seed data if database is empty
@app.post("/seed", status_code=status.HTTP_201_CREATED)
async def seed_data():
    # Check if database is empty
    if users_collection.count_documents({}) > 0:
        return {"message": "Database already contains data"}
    
    # Seed users
    users = [
        {
            "name": "Farmer John",
            "email": "john@village.com",
            "password": get_password_hash("password123"),
            "userType": "provider",
            "location": "North Village",
            "phone": "123-456-7890",
            "rating": 4.8,
            "bio": "I own a large farm and often need help with harvesting and maintenance.",
            "createdAt": datetime.utcnow()
        },
        {
            "name": "Carpenter Mike",
            "email": "mike@village.com",
            "password": get_password_hash("password123"),
            "userType": "provider",
            "location": "East Village",
            "phone": "123-456-7891",
            "rating": 4.5,
            "bio": "Master carpenter looking for assistants for various woodworking projects.",
            "createdAt": datetime.utcnow()
        },
        {
            "name": "Shopkeeper Lisa",
            "email": "lisa@village.com",
            "password": get_password_hash("password123"),
            "userType": "provider",
            "location": "Central Village",
            "phone": "123-456-7892",
            "rating": 4.9,
            "bio": "I run the village general store and need help with inventory and customer service.",
            "createdAt": datetime.utcnow()
        },
        {
            "name": "Tom Smith",
            "email": "tom@village.com",
            "password": get_password_hash("password123"),
            "userType": "seeker",
            "location": "South Village",
            "phone": "123-456-7893",
            "rating": 4.7,
            "bio": "Hard worker with experience in farming and construction.",
            "skills": ["farming", "construction", "animal care"],
            "createdAt": datetime.utcnow()
        },
        {
            "name": "Sarah Johnson",
            "email": "sarah@village.com",
            "password": get_password_hash("password123"),
            "userType": "seeker",
            "location": "West Village",
            "phone": "123-456-7894",
            "rating": 4.6,
            "bio": "Skilled in crafting, cooking, and childcare.",
            "skills": ["cooking", "childcare", "crafting"],
            "createdAt": datetime.utcnow()
        },
        {
            "name": "David Lee",
            "email": "david@village.com",
            "password": get_password_hash("password123"),
            "userType": "seeker",
            "location": "North Village",
            "phone": "123-456-7895",
            "rating": 4.4,
            "bio": "Strong and reliable worker, good with animals and farming.",
            "skills": ["farming", "animal care", "heavy lifting"],
            "createdAt": datetime.utcnow()
        }
    ]
    
    users_collection.insert_many(users)
    
    # Get user IDs
    farmer_john = users_collection.find_one({"email": "john@village.com"})
    carpenter_mike = users_collection.find_one({"email": "mike@village.com"})
    shopkeeper_lisa = users_collection.find_one({"email": "lisa@village.com"})
    tom_smith = users_collection.find_one({"email": "tom@village.com"})
    sarah_johnson = users_collection.find_one({"email": "sarah@village.com"})
    david_lee = users_collection.find_one({"email": "david@village.com"})
    
    # Seed jobs
    jobs = [
        {
            "title": "Harvest Help Needed",
            "description": "Looking for 2 people to help with wheat harvest. Experience preferred but not required.",
            "location": "North Village",
            "category": "Farming",
            "requiredSkills": ["farming", "heavy lifting"],
            "payment": "50 coins per day",
            "duration": "3 days",
            "providerId": str(farmer_john["_id"]),
            "providerName": farmer_john["name"],
            "status": "open",
            "createdAt": datetime.utcnow(),
            "applicants": 1
        },
        {
            "title": "Furniture Repair Assistant",
            "description": "Need someone to help repair village furniture. Must have basic woodworking skills.",
            "location": "East Village",
            "category": "Carpentry",
            "requiredSkills": ["construction", "crafting"],
            "payment": "70 coins per day",
            "duration": "5 days",
            "providerId": str(carpenter_mike["_id"]),
            "providerName": carpenter_mike["name"],
            "status": "open",
            "createdAt": datetime.utcnow(),
            "applicants": 2
        },
        {
            "title": "Store Inventory Manager",
            "description": "Help organize and manage store inventory. Must be detail-oriented and good with numbers.",
            "location": "Central Village",
            "category": "Retail",
            "requiredSkills": ["organization", "mathematics"],
            "payment": "60 coins per day",
            "duration": "Ongoing",
            "providerId": str(shopkeeper_lisa["_id"]),
            "providerName": shopkeeper_lisa["name"],
            "status": "open",
            "createdAt": datetime.utcnow(),
            "applicants": 0
        },
        {
            "title": "Animal Caretaker",
            "description": "Need someone to feed and care for farm animals while I am away.",
            "location": "North Village",
            "category": "Farming",
            "requiredSkills": ["animal care", "farming"],
            "payment": "55 coins per day",
            "duration": "7 days",
            "providerId": str(farmer_john["_id"]),
            "providerName": farmer_john["name"],
            "status": "assigned",
            "assignedTo": str(david_lee["_id"]),
            "createdAt": datetime.utcnow() - timedelta(days=7),
            "applicants": 3
        },
        {
            "title": "Festival Food Preparation",
            "description": "Looking for someone to help prepare food for the upcoming village festival.",
            "location": "Central Village",
            "category": "Cooking",
            "requiredSkills": ["cooking"],
            "payment": "65 coins per day",
            "duration": "2 days",
            "providerId": str(shopkeeper_lisa["_id"]),
            "providerName": shopkeeper_lisa["name"],
            "status": "completed",
            "assignedTo": str(sarah_johnson["_id"]),
            "createdAt": datetime.utcnow() - timedelta(days=12),
            "completedAt": datetime.utcnow() - timedelta(days=10),
            "applicants": 2
        }
    ]
    
    jobs_collection.insert_many(jobs)
    
    # Get job IDs
    harvest_job = jobs_collection.find_one({"title": "Harvest Help Needed"})
    furniture_job = jobs_collection.find_one({"title": "Furniture Repair Assistant"})
    inventory_job = jobs_collection.find_one({"title": "Store Inventory Manager"})
    animal_job = jobs_collection.find_one({"title": "Animal Caretaker"})
    festival_job = jobs_collection.find_one({"title": "Festival Food Preparation"})
    
    # Seed applications
    applications = [
        {
            "jobId": str(harvest_job["_id"]),
            "seekerId": str(david_lee["_id"]),
            "seekerName": david_lee["name"],
            "status": "pending",
            "appliedAt": datetime.utcnow() - timedelta(hours=2),
            "seekerProfile": {
                "skills": david_lee["skills"],
                "rating": david_lee["rating"],
                "experience": david_lee["bio"]
            }
        },
        {
            "jobId": str(furniture_job["_id"]),
            "seekerId": str(tom_smith["_id"]),
            "seekerName": tom_smith["name"],
            "status": "pending",
            "appliedAt": datetime.utcnow() - timedelta(hours=1),
            "seekerProfile": {
                "skills": tom_smith["skills"],
                "rating": tom_smith["rating"],
                "experience": tom_smith["bio"]
            }
        },
        {
            "jobId": str(furniture_job["_id"]),
            "seekerId": str(sarah_johnson["_id"]),
            "seekerName": sarah_johnson["name"],
            "status": "pending",
            "appliedAt": datetime.utcnow() - timedelta(minutes=30),
            "seekerProfile": {
                "skills": sarah_johnson["skills"],
                "rating": sarah_johnson["rating"],
                "experience": sarah_johnson["bio"]
            }
        },
        {
            "jobId": str(animal_job["_id"]),
            "seekerId": str(david_lee["_id"]),
            "seekerName": david_lee["name"],
            "status": "selected",
            "appliedAt": datetime.utcnow() - timedelta(days=8),
            "seekerProfile": {
                "skills": david_lee["skills"],
                "rating": david_lee["rating"],
                "experience": david_lee["bio"]
            }
        },
        {
            "jobId": str(festival_job["_id"]),
            "seekerId": str(sarah_johnson["_id"]),
            "seekerName": sarah_johnson["name"],
            "status": "completed",
            "appliedAt": datetime.utcnow() - timedelta(days=13),
            "seekerProfile": {
                "skills": sarah_johnson["skills"],
                "rating": sarah_johnson["rating"],
                "experience": sarah_johnson["bio"]
            },
            "feedback": {
                "rating": 5,
                "comment": "Sarah did an excellent job with the festival food preparation. Everyone loved it!"
            }
        }
    ]
    
    applications_collection.insert_many(applications)
    
    # Seed notifications
    notifications = [
        {
            "userId": str(farmer_john["_id"]),
            "type": "new-application",
            "title": "New Application",
            "message": f"{david_lee['name']} has applied for your job: {harvest_job['title']}",
            "read": False,
            "timestamp": datetime.utcnow() - timedelta(hours=2)
        },
        {
            "userId": str(carpenter_mike["_id"]),
            "type": "new-application",
            "title": "New Application",
            "message": f"{tom_smith['name']} has applied for your job: {furniture_job['title']}",
            "read": True,
            "timestamp": datetime.utcnow() - timedelta(hours=1)
        },
        {
            "userId": str(carpenter_mike["_id"]),
            "type": "new-application",
            "title": "New Application",
            "message": f"{sarah_johnson['name']} has applied for your job: {furniture_job['title']}",
            "read": False,
            "timestamp": datetime.utcnow() - timedelta(minutes=30)
        },
        {
            "userId": str(david_lee["_id"]),
            "type": "job-selected",
            "title": "Job Offer",
            "message": f"You've been selected for the job: {animal_job['title']}",
            "read": True,
            "timestamp": datetime.utcnow() - timedelta(days=7)
        },
        {
            "userId": str(sarah_johnson["_id"]),
            "type": "job-feedback",
            "title": "Job Feedback",
            "message": f"You received a 5-star rating for the job: {festival_job['title']}. Feedback: Sarah did an excellent job with the festival food preparation. Everyone loved it!",
            "read": False,
            "timestamp": datetime.utcnow() - timedelta(days=10)
        },
        {
            "userId": str(tom_smith["_id"]),
            "type": "new-matching-job",
            "title": "New Job Match",
            "message": f"A new job matching your skills has been posted: {harvest_job['title']}",
            "read": False,
            "timestamp": datetime.utcnow() - timedelta(days=1)
        }
    ]
    
    notifications_collection.insert_many(notifications)
    
    return {"message": "Database seeded successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
