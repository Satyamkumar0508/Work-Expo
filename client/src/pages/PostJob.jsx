"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useJobs } from "../contexts/JobContext"

const PostJob = () => {
  const { postJob } = useJobs()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    category: "",
    requiredSkills: "",
    payment: "",
    duration: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Process skills
      const processedData = {
        ...formData,
        requiredSkills: formData.requiredSkills.split(",").map((skill) => skill.trim().toLowerCase()),
      }

      // Get JWT token from localStorage
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:8000/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(processedData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || "Failed to post job")
      }

      // Success
      navigate("/provider")
    } catch (error) {
      setError(error.message || "Failed to post job")
      console.error(error)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Post a New Job</h2>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Job Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select location</option>
                <option value="North Village">North Village</option>
                <option value="South Village">South Village</option>
                <option value="East Village">East Village</option>
                <option value="West Village">West Village</option>
                <option value="Central Village">Central Village</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select category</option>
                <option value="Farming">Farming</option>
                <option value="Carpentry">Carpentry</option>
                <option value="Cooking">Cooking</option>
                <option value="Retail">Retail</option>
                <option value="Construction">Construction</option>
                <option value="Childcare">Childcare</option>
                <option value="Animal Care">Animal Care</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="payment" className="block text-sm font-medium text-gray-700 mb-1">
                Payment
              </label>
              <input
                id="payment"
                name="payment"
                type="text"
                value={formData.payment}
                onChange={handleChange}
                placeholder="e.g. 50 coins per day"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <input
                id="duration"
                name="duration"
                type="text"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g. 3 days, 1 week, Ongoing"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="requiredSkills" className="block text-sm font-medium text-gray-700 mb-1">
              Required Skills (comma separated)
            </label>
            <input
              id="requiredSkills"
              name="requiredSkills"
              type="text"
              value={formData.requiredSkills}
              onChange={handleChange}
              placeholder="e.g. farming, construction, cooking"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">Enter skills required for this job, separated by commas</p>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/provider")}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Posting..." : "Post Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PostJob
