// src/components/navigation/StudentNavigation.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Bell,
  Search,
  FileText,
  Building,
  Calendar,
  BookOpen,
  Users,
  TrendingUp,
  User,
  Menu,
  X,
  GraduationCap,
  LogOut,
  Settings,
  MessageSquare,
  BarChart3,
  CalendarDays
} from 'lucide-react';

interface NavigationProps {
  userName?: string;
  notificationCount?: number;
}

interface StudentData {
  name: string;
  rollNo: string;
  department: string;
  year: string;
  section: string;
  email: string;
  accommodation: string;
}

function StudentNavigation({ userName, notificationCount = 3 }: NavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Get student data from localStorage
  const [studentData] = useState<StudentData>(() => {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const parsed = JSON.parse(userData);
        return {
          name: parsed.name || 'John Doe',
          rollNo: parsed.rollNo || '20CS001',
          department: parsed.department || 'Computer Science Engineering',
          year: parsed.year || '3rd Year',
          section: parsed.section || 'A',
          email: parsed.email || 'student@sece.ac.in',
          accommodation: parsed.accommodation || 'Hostel'
        };
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return {
      name: userName || "John Doe",
      rollNo: "20CS001",
      department: "Computer Science Engineering",
      year: "3rd Year",
      section: "A",
      email: "student@sece.ac.in",
      accommodation: "Hostel"
    };
  });

  const navigationItems = [
    { name: 'Home', icon: <Home size={20} />, path: '/student/home' },
    { name: 'Announcements', icon: <Bell size={20} />, path: '/student/announcements' },
    { name: 'Lost & Found', icon: <Search size={20} />, path: '/student/lost-found' },
    { name: studentData.accommodation === 'Hostel' ? 'Hostel Complaint' : 'Travel Complaint', icon: <Building size={20} />, path: '/student/hostelcomplaint' },
    { name: 'Timetable Reminder', icon: <Calendar size={20} />, path: '/student/timetable' },
    { name: 'EduExchange', icon: <BookOpen size={20} />, path: '/student/edu-exchange' },
    { name: 'StudyConnect', icon: <Users size={20} />, path: '/student/study-connect' },
    { name: 'GrowTogether', icon: <TrendingUp size={20} />, path: '/student/growtogether' },
    { name: 'Events', icon: <CalendarDays size={20} />, path: '/student/events' },
    { name: 'Feedback & Polls', icon: <MessageSquare size={20} />, path: '/student/feedback-polls' },
    { name: 'Profile', icon: <User size={20} />, path: '/student/profile' }
  ];

  const handleNavClick = (itemName: string, path: string) => {
    console.log(`Navigating to: ${path}`);
    navigate(path);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      navigate('/login');
    }
  };

  const getUserInitials = (name: string): string => {
    if (!name || typeof name !== 'string') return 'JD';
    const nameParts = name.trim().split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    return nameParts
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  };

  const getFirstName = (name: string): string => {
    if (!name || typeof name !== 'string') return 'Student';
    return name.trim().split(' ')[0];
  };

  // Get current active item based on route
  const getCurrentActiveItem = () => {
    const currentPath = location.pathname;
    const currentItem = navigationItems.find(item => item.path === currentPath);
    return currentItem ? currentItem.name : 'Home';
  };

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #FFF5E0 0%, #FFEBEB 50%, #FFF5E0 100%);
          min-height: 100vh;
        }

        /* Top Navigation Bar */
        .top-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 70px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 105, 105, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 1000;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }

        .navbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .menu-toggle {
          display: none;
          background: none;
          border: none;
          color: #BB2525;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .menu-toggle:hover {
          background: rgba(255, 105, 105, 0.1);
        }

        .app-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #FF6969, #BB2525);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .app-name {
          font-size: 24px;
          font-weight: 700;
          color: #BB2525;
          background: linear-gradient(135deg, #BB2525, #FF6969);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .notification-btn {
          position: relative;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .notification-btn:hover {
          background: rgba(255, 105, 105, 0.1);
          color: #BB2525;
        }

        .notification-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: linear-gradient(135deg, #FF6969, #BB2525);
          color: white;
          font-size: 10px;
          font-weight: 600;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #333;
          font-weight: 500;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #FF6969, #BB2525);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        /* Side Navigation */
        .sidebar {
          position: fixed;
          top: 70px;
          left: 0;
          width: 280px;
          height: calc(100vh - 70px);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 105, 105, 0.1);
          padding: 24px 0;
          overflow-y: auto;
          z-index: 999;
          transition: transform 0.3s ease;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.08);
        }

        .sidebar.closed {
          transform: translateX(-100%);
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          color: #666;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
          border-left: 3px solid transparent;
          font-weight: 500;
          position: relative;
        }

        .nav-item:hover {
          background: rgba(255, 105, 105, 0.05);
          color: #BB2525;
          border-left-color: rgba(255, 105, 105, 0.3);
        }

        .nav-item.active {
          background: rgba(255, 105, 105, 0.1);
          color: #BB2525;
          border-left-color: #FF6969;
        }

        .nav-item.active .nav-icon {
          color: #FF6969;
        }

        .nav-icon {
          transition: color 0.3s ease;
        }

        .nav-text {
          font-size: 15px;
          flex: 1;
        }

        /* Logout Button */
        .logout-section {
          position: absolute;
          bottom: 24px;
          left: 0;
          right: 0;
          padding: 0 24px;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          width: 100%;
          background: none;
          border: 1px solid rgba(255, 105, 105, 0.2);
          border-radius: 8px;
          color: #666;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .logout-btn:hover {
          background: rgba(255, 105, 105, 0.1);
          color: #BB2525;
          border-color: #FF6969;
        }

        /* Mobile Overlay */
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 998;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }

        .sidebar-overlay.active {
          opacity: 1;
          visibility: visible;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .menu-toggle {
            display: block;
          }

          .app-name {
            font-size: 20px;
          }

          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .user-info span {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .top-navbar {
            padding: 0 16px;
          }

          .app-name {
            font-size: 18px;
          }

          .navbar-right {
            gap: 12px;
          }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        <div className="navbar-left">
          <button
            className="menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="app-logo">
            <div className="logo-icon">
              <GraduationCap size={24} />
            </div>
            <div className="app-name">CampusLink</div>
          </div>
        </div>

        <div className="navbar-right">
          <button className="notification-btn" aria-label="View notifications">
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="notification-badge">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          <div className="user-info">
            <div className="user-avatar">
              {getUserInitials(studentData.name)}
            </div>
            <span>{getFirstName(studentData.name)}</span>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay for Mobile */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Side Navigation */}
      <nav className={`sidebar ${isSidebarOpen ? 'open' : window.innerWidth <= 768 ? 'closed' : ''}`}>
        {/* All Navigation Items */}
        {navigationItems.map((item) => (
          <div
            key={item.name}
            className={`nav-item ${getCurrentActiveItem() === item.name ? 'active' : ''}`}
            onClick={() => handleNavClick(item.name, item.path)}
            role="button"
            tabIndex={0}
          >
            <div className="nav-icon">{item.icon}</div>
            <div className="nav-text">{item.name}</div>
          </div>
        ))}

        <div className="logout-section">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default StudentNavigation;
