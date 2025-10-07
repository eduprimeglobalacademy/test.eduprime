import React, { useState } from 'react'
import { GraduationCap, Users, Shield, BookOpen } from 'lucide-react'
import { SignInModal } from './auth/SignInModal'
import { RegisterModal } from './auth/RegisterModal'
import { Button } from './ui/Button'

export function LandingPage() {
  const [showSignIn, setShowSignIn] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-x-hidden">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-12 sm:py-24">
          <div className="text-center">
            <div className="flex justify-center items-center mb-8">
              <img 
                src="/eduprimelogo.jpg" 
                alt="EduPrime Global Academy" 
                className="w-16 h-16 sm:w-24 sm:h-24 object-contain"
              />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                EduPrime
              </span>
              <br />
              <span className="text-2xl sm:text-3xl md:text-4xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Global Academy
              </span>
            </h1>
            <p className="text-base sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed px-4">
              Premier educational assessment platform designed for excellence in modern learning. 
              Create, distribute, and evaluate assessments with world-class security and precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={() => setShowSignIn(true)}
                className="w-full sm:w-auto min-w-[140px] shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowRegister(true)}
                className="w-full sm:w-auto min-w-[140px] shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Register as Educator
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Why Choose EduPrime Global Academy?</h2>
            <p className="text-base sm:text-lg text-gray-600 px-4">World-class features designed for educational excellence</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-6 group-hover:bg-blue-200 transition-colors duration-200">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Role-Based Access</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed px-2">
                Enterprise-grade authentication system with distinct roles for administrators, educators, and learners. 
                Token-based educator registration ensures institutional security and controlled access.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-xl mb-6 group-hover:bg-green-200 transition-colors duration-200">
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Advanced Assessment Management</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed px-2">
                Create sophisticated assessments with flexible scheduling, automatic submission, and comprehensive analytics. 
                Learners access assessments via secure links or institutional codes.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-xl mb-6 group-hover:bg-purple-200 transition-colors duration-200">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Enterprise Security & Reliability</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed px-2">
                Built with enterprise-grade security standards. Automatic submission, precise time controls, and comprehensive reporting 
                ensure fair and reliable assessment experiences for global institutions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-base sm:text-lg text-gray-600 px-4">Streamlined workflow for educational institutions</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200 text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-6 mx-auto">1</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Institutional Setup</h3>
              <p className="text-sm sm:text-base text-gray-600">Administrators create educator tokens with verification for secure institutional onboarding</p>
            </div>
            
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200 text-center">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-6 mx-auto">2</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Educator Creates</h3>
              <p className="text-sm sm:text-base text-gray-600">Educators register with tokens, create comprehensive assessments, and schedule them with flexible timing</p>
            </div>
            
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200 text-center sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-6 mx-auto">3</div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Learners Take Assessments</h3>
              <p className="text-sm sm:text-base text-gray-600">Learners access assessments via secure links or codes, complete timed evaluations, and receive instant feedback</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
      <RegisterModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
    </div>
  )
}