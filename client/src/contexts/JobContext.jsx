"use client"

import { createContext, useState, useContext, useEffect } from "react"
import { useAuth } from "./AuthContext"
import { useNotifications } from "./NotificationContext"
import axios from "axios"

const JobContext = createContext()

export const useJobs = () => useContext(JobContext)

export const JobProvider = ({ children }) => {
  const { currentUser } = useAuth()
  const { refreshNotifications } = useNotifications()
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)
  const [applicationsByJob, setApplicationsByJob] = useState({})

  // Fetch jobs when user changes
  useEffect(() => {
    if (currentUser) {
      fetchJobs()
      if (currentUser.userType === "seeker") {
        // This was the issue - calling a non-existent function
        getSeekerApplications() // Changed from fetchSeekerApplications to getSeekerApplications
      }
    } else {
      setJobs([])
      setApplications([])
      setApplicationsByJob({})
    }
  }, [currentUser])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const response = await axios.get("/jobs")
      const jobsData = response.data || []
      setJobs(jobsData)
      return jobsData
    } catch (error) {
      console.error("Error fetching jobs:", error)
      // Don't update state on error to keep previous data
      // If this is the first load, set empty array
      if (jobs.length === 0) {
        setJobs([])
      }
      return []
    } finally {
      setLoading(false)
    }
  }

  // Get jobs posted by the current provider
  const getProviderJobs = async () => {
    if (!currentUser || currentUser.userType !== "provider") return []

    setLoading(true)
    try {
      const response = await axios.get("/jobs/provider")
      const providerJobs = response.data || []

      // Update the jobs state with these jobs
      setJobs((prevJobs) => {
        // Create a map of existing jobs by ID
        const jobMap = new Map(prevJobs.map((job) => [job.id, job]))

        // Add or update provider jobs
        providerJobs.forEach((job) => {
          jobMap.set(job.id, job)
        })

        return Array.from(jobMap.values())
      })

      return providerJobs
    } catch (error) {
      console.error("Error fetching provider jobs:", error)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Get jobs that match the seeker's skills
  const getMatchingJobs = async () => {
    if (!currentUser || currentUser.userType !== "seeker") return []

    setLoading(true)
    try {
      const response = await axios.get("/jobs/matching")
      const matchingJobs = response.data || []

      // Update the jobs state with these jobs
      setJobs((prevJobs) => {
        // Create a map of existing jobs by ID
        const jobMap = new Map(prevJobs.map((job) => [job.id, job]))

        // Add or update matching jobs
        matchingJobs.forEach((job) => {
          jobMap.set(job.id, job)
        })

        return Array.from(jobMap.values())
      })

      return matchingJobs
    } catch (error) {
      console.error("Error fetching matching jobs:", error)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Get all available jobs for seekers
  const getAvailableJobs = async (filters = {}) => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (filters.status) params.append("status", filters.status)
      if (filters.location && filters.location !== "all") params.append("location", filters.location)
      if (filters.category && filters.category !== "all") params.append("category", filters.category)

      const response = await axios.get(`/jobs?${params.toString()}`)
      const availableJobs = response.data || []

      // Update the jobs state
      setJobs(availableJobs)

      return availableJobs
    } catch (error) {
      console.error("Error fetching available jobs:", error)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Get applications for a specific job
  const getJobApplications = async (jobId) => {
    // If we already have applications for this job, return them
    if (applicationsByJob[jobId]) {
      return applicationsByJob[jobId]
    }

    // For providers, fetch from API
    if (currentUser && currentUser.userType === "provider") {
      setLoading(true)
      try {
        const response = await axios.get(`/applications/job/${jobId}`)
        const jobApplications = response.data || []

        // Update applications state
        setApplications((prevApplications) => {
          // Create a map of existing applications by ID
          const appMap = new Map(prevApplications.map((app) => [app.id, app]))

          // Add or update job applications
          jobApplications.forEach((app) => {
            appMap.set(app.id, app)
          })

          return Array.from(appMap.values())
        })

        // Update applicationsByJob cache
        setApplicationsByJob((prev) => ({
          ...prev,
          [jobId]: jobApplications,
        }))

        return jobApplications
      } catch (error) {
        console.error(`Error fetching applications for job ${jobId}:`, error)
        return []
      } finally {
        setLoading(false)
      }
    }
    // For seekers, filter from existing applications
    else if (currentUser && currentUser.userType === "seeker") {
      // Filter applications for this job from the seeker's applications
      const jobApps = applications.filter((app) => app.jobId === jobId) || []

      // Update applicationsByJob cache
      setApplicationsByJob((prev) => ({
        ...prev,
        [jobId]: jobApps,
      }))

      return jobApps
    }

    return []
  }

  // Get applications made by the current seeker
  const getSeekerApplications = async () => {
    if (!currentUser || currentUser.userType !== "seeker") return []

    setLoading(true)
    try {
      const response = await axios.get("/applications/seeker")
      const seekerApplications = response.data || []

      // Update applications state
      setApplications(seekerApplications)

      // Update applicationsByJob cache
      const appsByJob = {}
      seekerApplications.forEach((app) => {
        if (!appsByJob[app.jobId]) {
          appsByJob[app.jobId] = []
        }
        appsByJob[app.jobId].push(app)
      })
      setApplicationsByJob(appsByJob)

      return seekerApplications
    } catch (error) {
      console.error("Error fetching seeker applications:", error)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Post a new job
  const postJob = async (jobData) => {
    if (!currentUser || currentUser.userType !== "provider") {
      throw new Error("Only job providers can post jobs")
    }

    setLoading(true)
    try {
      const response = await axios.post("/jobs", jobData)
      const newJob = response.data

      // Update jobs state
      setJobs((prevJobs) => [...prevJobs, newJob])

      // Refresh notifications as new ones might have been created
      refreshNotifications()

      return newJob
    } catch (error) {
      console.error("Error posting job:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Apply for a job
  const applyForJob = async (jobId) => {
    if (!currentUser || currentUser.userType !== "seeker") {
      throw new Error("Only job seekers can apply for jobs")
    }

    setLoading(true)
    try {
      const applicationData = {
        jobId,
        seekerId: currentUser.id,
        seekerName: currentUser.name,
      }

      const response = await axios.post("/applications", applicationData)
      const newApplication = response.data

      // Update applications state
      setApplications((prevApplications) => [...prevApplications, newApplication])

      // Update applicationsByJob cache
      setApplicationsByJob((prev) => ({
        ...prev,
        [jobId]: [...(prev[jobId] || []), newApplication],
      }))

      // Update job applicants count in jobs state
      setJobs((prevJobs) =>
        prevJobs.map((job) => (job.id === jobId ? { ...job, applicants: job.applicants + 1 } : job)),
      )

      // Refresh notifications
      refreshNotifications()

      return true
    } catch (error) {
      console.error(`Error applying for job ${jobId}:`, error)

      // If the error is because they already applied, return false
      if (error.response && error.response.status === 400) {
        return false
      }

      throw error
    } finally {
      setLoading(false)
    }
  }

  // Select an applicant for a job
  const selectApplicant = async (applicationId) => {
    if (!currentUser || currentUser.userType !== "provider") {
      throw new Error("Only job providers can select applicants")
    }

    setLoading(true)
    try {
      const response = await axios.put(`/applications/${applicationId}/select`)
      const updatedApplication = response.data

      // Update applications state - mark selected application and reject others
      setApplications((prevApplications) =>
        prevApplications.map((app) =>
          app.id === applicationId
            ? { ...app, status: "selected" }
            : app.jobId === updatedApplication.jobId
              ? { ...app, status: "rejected" }
              : app,
        ),
      )

      // Update applicationsByJob cache
      const jobId = updatedApplication.jobId
      if (applicationsByJob[jobId]) {
        setApplicationsByJob((prev) => ({
          ...prev,
          [jobId]: prev[jobId].map((app) =>
            app.id === applicationId ? { ...app, status: "selected" } : { ...app, status: "rejected" },
          ),
        }))
      }

      // Update job status in jobs state
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === updatedApplication.jobId
            ? { ...job, status: "assigned", assignedTo: updatedApplication.seekerId }
            : job,
        ),
      )

      // Refresh notifications
      refreshNotifications()

      return true
    } catch (error) {
      console.error(`Error selecting applicant ${applicationId}:`, error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Mark a job as completed
  const completeJob = async (jobId, rating, feedback) => {
    if (!currentUser) {
      throw new Error("You must be logged in to complete a job")
    }

    setLoading(true)
    try {
      const completionData = {
        rating,
        feedback,
      }

      const response = await axios.put(`/jobs/${jobId}/complete`, completionData)
      const updatedJob = response.data

      // Update job status in jobs state
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === jobId ? { ...job, status: "completed", completedAt: new Date().toISOString() } : job,
        ),
      )

      // Refresh notifications
      refreshNotifications()

      return true
    } catch (error) {
      console.error(`Error completing job ${jobId}:`, error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value = {
    jobs,
    applications,
    loading,
    getProviderJobs,
    getMatchingJobs,
    getAvailableJobs,
    getJobApplications,
    getSeekerApplications,
    postJob,
    applyForJob,
    selectApplicant,
    completeJob,
    refreshJobs: fetchJobs,
  }

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>
}
