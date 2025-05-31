import { Link } from "react-router-dom"

const Footer = () => {
  return (
    <footer className="bg-emerald-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Workers Globe</h3>
            <p className="text-emerald-100">
              Connecting villagers with local job opportunities. Find work or hire help in your community.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-emerald-100 hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-emerald-100 hover:text-white">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-emerald-100 hover:text-white">
                  Register
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Contact us</h3>
            {/* <p className="text-emerald-100"></p> */}
            <p className="text-emerald-100">satyamprajapati0508@gmail.com</p>
          </div>
        </div>

        <div className="border-t border-emerald-700 mt-8 pt-6 text-center text-emerald-100">
          <p>&copy; {new Date().getFullYear()} Workers Globe. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
