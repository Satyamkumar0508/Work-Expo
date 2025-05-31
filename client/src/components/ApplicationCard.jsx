"use client"

import { useState } from "react"
import { Star, ThumbsUp } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useJobs } from "../contexts/JobContext"

const ApplicationCard = ({ application, job }) => {
  const { currentUser } = useAuth()
  const { selectApplicant } = useJobs()
  const [showContact, setShowContact] = useState(false)

  const isSelected = application.status === "selected"
  const isRejected = job.status === "assigned" && application.status !== "selected"
  const isCompleted = job.status === "completed"

  const handleSelect = () => {
    if (window.confirm(`Are you sure you want to select ${application.seekerName} for this job?`)) {
      selectApplicant(application.id)
    }
  }

  const renderStars = (rating) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          size={16}
          className={i < Math.floor(rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
        />
      ))
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden border ${
        isSelected ? "border-emerald-500" : isRejected ? "border-gray-300 opacity-75" : "border-gray-200"
      }`}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl mr-4">
              {application.seekerName.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{application.seekerName}</h3>
              <div className="flex items-center mt-1">
                {renderStars(application.seekerProfile.rating)}
                <span className="ml-2 text-sm text-gray-600">{application.seekerProfile.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isSelected
                ? "bg-emerald-100 text-emerald-800"
                : isRejected
                  ? "bg-gray-100 text-gray-800"
                  : "bg-blue-100 text-blue-800"
            }`}
          >
            {isSelected ? "Selected" : isRejected ? "Not Selected" : "Pending"}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Skills:</div>
          <div className="flex flex-wrap gap-2">
            {application.seekerProfile.skills.map((skill, index) => (
              <span
                key={index}
                className={`px-3 py-1 rounded-full text-xs ${
                  job.requiredSkills.includes(skill) ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"
                }`}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Experience:</div>
          <p className="text-gray-600 text-sm">{application.seekerProfile.experience}</p>
        </div>

        <div className="text-sm text-gray-500 mb-4">
          Applied on {new Date(application.appliedAt).toLocaleDateString()}
        </div>

        {isSelected && (
          <div className="mb-4">
            <button
              onClick={() => setShowContact(!showContact)}
              className="text-emerald-600 hover:text-emerald-800 text-sm font-medium flex items-center"
            >
              {showContact ? "Hide Contact Info" : "Show Contact Info"}
            </button>

            {showContact && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="text-sm">
                  <span className="font-medium">Email:</span> {application.seekerId}@village.com
                </div>
                <div className="text-sm">
                  <span className="font-medium">Phone:</span> 123-456-7890
                </div>
              </div>
            )}
          </div>
        )}

        {currentUser.userType === "provider" && job.status === "open" && (
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleSelect}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center"
            >
              <ThumbsUp size={16} className="mr-2" />
              Select Applicant
            </button>
          </div>
        )}

        {isCompleted && application.feedback && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">Feedback:</div>
            <div className="flex items-center mb-2">
              {renderStars(application.feedback.rating)}
              <span className="ml-2 text-sm text-gray-600">{application.feedback.rating.toFixed(1)}</span>
            </div>
            <p className="text-gray-600 text-sm">{application.feedback.comment}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApplicationCard
