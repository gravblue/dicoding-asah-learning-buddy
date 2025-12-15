import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, TrendingUp, Award, AlertCircle, CheckCircle, BookOpen, Target, BarChart3, ChevronRight, Star, Home, ChevronLeft } from 'lucide-react';
export default function DashboardPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hoveredCourse, setHoveredCourse] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchUserProgress();
  }, []);

  const fetchUserProgress = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const authData = JSON.parse(localStorage.getItem('lb_auth') || '{}');
      const email = authData.email;

      if (!email) {
        throw new Error('Please login first');
      }

      console.log('📧 Fetching progress for:', email);

      const response = await fetch(`http://localhost:8000/ml-advanced/progress_by_email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify({ email })
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error('Failed to fetch progress data');
      }

      const data = await response.json();
      console.log('✅ API Response:', data);
      
      const parsePercentage = (str) => {
        if (typeof str === 'string') {
          return parseFloat(str.replace('%', '')) || 0;
        }
        return parseFloat(str) || 0;
      };

      const parseScore = (str) => {
        if (typeof str === 'string' && str.includes('/')) {
          return parseInt(str.split('/')[0]) || 0;
        }
        return parseInt(str) || 0;
      };

      const parseRating = (str) => {
        if (typeof str === 'string' && str.includes('/')) {
          return parseFloat(str.split('/')[0]) || 0;
        }
        return parseFloat(str) || 0;
      };

      const transformedData = {
        name: data.student_name || authData.name || 'User',
        email: data.email || email,
        avatar: (data.student_name || authData.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
        currentCourse: data.current_course || 'No active course',
        completionRate: parsePercentage(data.completion_rate),
        examScore: parseScore(data.exam_score),
        submissionRating: parseRating(data.submission_rating),
        successProbability: parsePercentage(data.success_probability),
        status: data.overall_status || 'Unknown',
        totalPoints: Math.round(parsePercentage(data.completion_rate) * 10),
        hoursStudied: Math.round(parsePercentage(data.completion_rate) / 5),
        weeklyGoal: 20,
        recommendedCourses: data.recommended_courses || [],
        nextSteps: data.next_steps || [],
        estimatedCompletion: data.estimated_completion || 'Unknown',
        insights: data.insights || []
      };

      console.log('🎯 Transformed Data:', transformedData);
      setUserData(transformedData);
    } catch (err) {
      console.error('💥 Error fetching progress:', err);
      setError(err.message);
      
      try {
        const authData = JSON.parse(localStorage.getItem('lb_auth') || '{}');
        setUserData({
          name: authData.name || "Guest User",
          email: authData.email || "guest@example.com",
          avatar: (authData.name || "GU").split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
          currentCourse: "No active course",
          completionRate: 0,
          examScore: 0,
          submissionRating: 0,
          successProbability: 0,
          status: "Unknown",
          totalPoints: 0,
          hoursStudied: 0,
          weeklyGoal: 20,
          recommendedCourses: [],
          nextSteps: [],
          estimatedCompletion: 'Unknown',
          insights: []
        });
      } catch {
        setUserData({
          name: "Guest User",
          email: "guest@example.com",
          avatar: "GU",
          currentCourse: "No active course",
          completionRate: 0,
          examScore: 0,
          submissionRating: 0,
          successProbability: 0,
          status: "Unknown",
          totalPoints: 0,
          hoursStudied: 0,
          weeklyGoal: 20,
          recommendedCourses: [],
          nextSteps: [],
          estimatedCompletion: 'Unknown',
          insights: []
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 50%, #e0f2fe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid rgba(139, 92, 246, 0.2)',
            borderTopColor: '#8B5CF6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6B7280', fontSize: '16px', fontWeight: '600' }}>
            Loading your dashboard...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const courses = userData.recommendedCourses.slice(0, 3).map((course, idx) => {
    const colors = ['#A78BFA', '#34D399', '#F59E0B'];
    const icons = ['☁️', '⚡', '🏗️'];
    const statuses = idx === 0 ? 'in-progress' : 'not-started';
    
    return {
      id: idx + 1,
      title: course.name || course.course_name || `Course ${idx + 1}`,
      instructor: course.instructor || 'Dicoding',
      progress: idx === 0 ? userData.completionRate : 0,
      totalHours: course.hours_to_study || course.duration_hours || 50,
      completedHours: idx === 0 ? Math.round((userData.completionRate / 100) * (course.hours_to_study || 50)) : 0,
      deadline: course.deadline || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: colors[idx],
      icon: icons[idx],
      status: statuses,
      level: course.course_difficulty || course.level || 'Pemula'
    };
  });

  if (courses.length === 0) {
    courses.push({
      id: 1,
      title: userData.currentCourse,
      instructor: 'Dicoding',
      progress: userData.completionRate,
      totalHours: 50,
      completedHours: Math.round((userData.completionRate / 100) * 50),
      deadline: 'TBD',
      color: '#A78BFA',
      icon: '📚',
      status: 'in-progress',
      level: 'Pemula'
    });
  }

  const generateWeeklyActivity = () => {
    const activity = [];
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const avgHours = userData.hoursStudied / 7;
    
    for (let i = 0; i < 7; i++) {
      const variance = Math.random() * 2 - 1;
      const hours = Math.max(0, Math.round(avgHours + variance));
      activity.push({
        day: daysOfWeek[i],
        hours: hours
      });
    }
    return activity;
  };

  const weeklyActivity = generateWeeklyActivity();

  const generateEvents = () => {
    const events = [];
    const today = new Date();
    
    userData.nextSteps.forEach((step, idx) => {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + idx + 1);
      
      const stepText = typeof step === 'string' ? step : step.action || step.description || 'Next Step';
      
      events.push({
        title: stepText,
        date: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: `${10 + idx}:00`,
        type: idx === 0 ? 'urgent' : 'important',
        fullDate: futureDate
      });
    });

    if (events.length === 0) {
      const event1 = new Date(today);
      event1.setDate(today.getDate() + 3);
      const event2 = new Date(today);
      event2.setDate(today.getDate() + 6);
      
      events.push(
        { title: "Review Course Material", date: event1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), time: "14:00", type: "regular", fullDate: event1 },
        { title: "Complete Assignment", date: event2.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), time: "23:59", type: "deadline", fullDate: event2 }
      );
    }

    return events.slice(0, 5);
  };

  const upcomingEvents = generateEvents();

  const getStatusConfig = () => {
    const probability = userData.successProbability;
    if (probability < 30) {
      return {
        color: '#EF4444',
        bgColor: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
        borderColor: '#FCA5A5',
        message: '⚠️'
      };
    } else if (probability < 70) {
      return {
        color: '#F59E0B',
        bgColor: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        borderColor: '#FCD34D',
        message: '⚡'
      };
    } else {
      return {
        color: '#10B981',
        bgColor: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
        borderColor: '#6EE7B7',
        message: '✅'
      };
    }
  };

  const statusConfig = getStatusConfig();

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(calendarMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const maxHours = Math.max(...weeklyActivity.map(d => d.hours), 5);

  const previousMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const isEventDay = (day) => {
    const checkDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    return upcomingEvents.some(event => {
      if (event.fullDate) {
        return event.fullDate.getDate() === day && 
               event.fullDate.getMonth() === calendarMonth.getMonth() &&
               event.fullDate.getFullYear() === calendarMonth.getFullYear();
      }
      return false;
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           calendarMonth.getMonth() === today.getMonth() &&
           calendarMonth.getFullYear() === today.getFullYear();
  };

  const getFormattedTime = () => {
    return currentDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getFormattedDate = () => {
    return currentDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      width: '100%'
    }}>
      <div style={{
        minHeight: '100vh',
        padding: '32px 48px',
        background: 'rgba(255, 255, 255, 0.98)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 10px 25px rgba(139, 92, 246, 0.35), inset 0 -2px 8px rgba(0,0,0,0.1)',
              animation: 'floatIcon 3s ease-in-out infinite'
            }}>
              📚
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: '800',
                color: '#1F2937',
                background: 'linear-gradient(135deg, #1F2937 0%, #6B7280 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em'
              }}>
                Welcome back, {userData.name.split(' ')[0]}!
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                <p style={{ margin: 0, color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>
                  {userData.email}
                </p>
                <span style={{
                  padding: '2px 8px',
                  background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#7C3AED',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {userData.status}
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              padding: '10px 16px',
              background: 'white',
              border: '2px solid #E5E7EB',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '800',
                color: '#1F2937',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {getFormattedTime()}
              </div>
              <div style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {getFormattedDate().split(',')[0]}
              </div>
            </div>
            
            <button
              onClick={() => navigate('/')}  // ← INI YANG BARU
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                border: 'none',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: '700',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 6px 20px rgba(139, 92, 246, 0.2)',
                position: 'relative',
                overflow: 'hidden',
                letterSpacing: '0.02em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.querySelector('.shine').style.left = '100%';
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(139, 92, 246, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.querySelector('.shine').style.left = '-100%';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
              }}
            >
              <div 
                className="shine"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  transition: 'left 0.6s ease-in-out',
                  pointerEvents: 'none'
                }} 
              />

              <Home size={18} strokeWidth={2.8} style={{ position: 'relative', zIndex: 1 }} /> 
              <span style={{ position: 'relative', zIndex: 1 }}>Home</span>
            </button>
            
            <div style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '700',
              color: '#92400E',
              fontSize: '14px',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.25)',
              animation: 'pulseGlow 2s ease-in-out infinite'
            }}>
              <Star size={16} fill="#F59E0B" color="#F59E0B" />
              {userData.totalPoints} Points
            </div>
            
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1) rotate(5deg)';
              e.target.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1) rotate(0deg)';
              e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
            }}
            >
              {userData.avatar}
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        <div style={{
          background: statusConfig.bgColor,
          border: `2px solid ${statusConfig.borderColor}`,
          borderRadius: '18px',
          padding: '18px 24px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          animation: userData.successProbability < 30 ? 'pulse 2s ease-in-out infinite' : 'slideIn 0.5s ease-out',
          boxShadow: `0 8px 24px ${statusConfig.color}20`
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: statusConfig.color + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertCircle size={28} color={statusConfig.color} />
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ color: statusConfig.color, fontSize: '16px', fontWeight: '700' }}>
              Status: {userData.status} {statusConfig.message}
            </strong>
            <p style={{ margin: '6px 0 0', color: statusConfig.color, fontSize: '14px', fontWeight: '500', opacity: 0.9 }}>
              Completion: {userData.completionRate.toFixed(1)}% • Exam: {userData.examScore}/100 • Rating: {userData.submissionRating.toFixed(1)}/5
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            marginBottom: '24px',
            padding: '18px',
            background: '#FEF2F2',
            border: '2px solid #FEE2E2',
            borderRadius: '18px',
            color: '#DC2626',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'slideIn 0.5s ease-out'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Unable to load full progress data</strong>
              <br />
              <small>Showing basic information. The API might be unavailable or you need to complete the onboarding first.</small>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
            borderRadius: '24px',
            padding: '28px',
            border: '2px solid #DDD6FE',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(124, 58, 237, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
              <div>
                <p style={{ margin: 0, color: '#6B7280', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Success Rate</p>
                <h3 style={{ margin: '12px 0', fontSize: '42px', fontWeight: '800', color: '#7C3AED', lineHeight: 1 }}>
                  {userData.successProbability.toFixed(1)}%
                </h3>
                <p style={{ margin: 0, color: '#9333EA', fontSize: '14px', fontWeight: '600' }}>
                  {userData.successProbability >= 70 ? '↑ Excellent Progress!' : userData.successProbability >= 30 ? '→ Keep Pushing' : '↓ Need More Focus'}
                </p>
              </div>
              <div style={{
                background: 'rgba(124, 58, 237, 0.15)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'bounce 2s ease-in-out infinite'
              }}>
                <TrendingUp size={28} color="#7C3AED" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
            borderRadius: '24px',
            padding: '28px',
            border: '2px solid #93C5FD',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(29, 78, 216, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(29, 78, 216, 0.15) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
              <div>
                <p style={{ margin: 0, color: '#6B7280', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hours Studied</p>
                <h3 style={{ margin: '12px 0', fontSize: '42px', fontWeight: '800', color: '#1D4ED8', lineHeight: 1 }}>
                  {userData.hoursStudied}h
                </h3>
                <p style={{ margin: 0, color: '#2563EB', fontSize: '14px', fontWeight: '600' }}>
                  of {userData.weeklyGoal}h weekly goal
                </p>
              </div>
              <div style={{
                background: 'rgba(29, 78, 216, 0.15)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'bounce 2s ease-in-out infinite'
              }}>
                <Clock size={28} color="#1D4ED8" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
            borderRadius: '24px',
            padding: '28px',
            border: '2px solid #6EE7B7',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(5, 150, 105, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(5, 150, 105, 0.15) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
              <div>
                <p style={{ margin: 0, color: '#6B7280', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completion</p>
                <h3 style={{ margin: '12px 0', fontSize: '42px', fontWeight: '800', color: '#059669', lineHeight: 1 }}>
                  {userData.completionRate.toFixed(0)}%
                </h3>
                <p style={{ margin: 0, color: '#10B981', fontSize: '14px', fontWeight: '600' }}>
                  {userData.estimatedCompletion} remaining
                </p>
              </div>
              <div style={{
                background: 'rgba(5, 150, 105, 0.15)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'bounce 2s ease-in-out infinite'
              }}>
                <Target size={28} color="#059669" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid - Courses and Calendar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Courses Section */}
          <div style={{
            gridColumn: 'span 2',
            minWidth: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1F2937' }}>
                Your Courses
              </h2>
              <button style={{
                background: 'none',
                border: 'none',
                color: '#8B5CF6',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                padding: '8px 12px',
                borderRadius: '10px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                e.target.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.transform = 'translateX(0)';
              }}
              >
                View All <ChevronRight size={18} />
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {courses.map((course) => (
                <div
                  key={course.id}
                  style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '26px',
                    border: hoveredCourse === course.id ? `3px solid ${course.color}` : '2px solid #F3F4F6',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    setHoveredCourse(course.id);
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                    e.currentTarget.style.boxShadow = `0 25px 50px ${course.color}30`;
                  }}
                  onMouseLeave={(e) => {
                    setHoveredCourse(null);
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '-40px',
                    width: '150px',
                    height: '150px',
                    background: `radial-gradient(circle, ${course.color}15 0%, transparent 70%)`,
                    pointerEvents: 'none',
                    transition: 'all 0.4s',
                    transform: hoveredCourse === course.id ? 'scale(1.3) rotate(45deg)' : 'scale(1) rotate(0deg)'
                  }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      background: `${course.color}20`,
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      flexShrink: 0,
                      transition: 'all 0.3s',
                      transform: hoveredCourse === course.id ? 'scale(1.1) rotate(10deg)' : 'scale(1) rotate(0deg)'
                    }}>
                      {course.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: '0 0 6px',
                        fontSize: '17px',
                        fontWeight: '800',
                        color: '#1F2937',
                        lineHeight: '1.3'
                      }}>
                        {course.title}
                      </h3>
                      <p style={{ margin: 0, color: '#6B7280', fontSize: '13px', fontWeight: '500' }}>
                        {course.instructor}
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '10px'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#6B7280' }}>
                        Progress
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: course.color }}>
                        {course.progress}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '10px',
                      background: '#F3F4F6',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: `${course.progress}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${course.color} 0%, ${course.color}CC 100%)`,
                        borderRadius: '6px',
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                          animation: 'shimmer 2s infinite'
                        }} />
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '18px',
                    borderTop: '2px solid #F3F4F6'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#6B7280" />
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600' }}>
                        {course.completedHours}h / {course.totalHours}h
                      </span>
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      background: `${course.color}15`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: course.color
                    }}>
                      {course.level}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Calendar with Real-time Updates */}
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '28px',
            border: '2px solid #F3F4F6',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1F2937' }}>
                {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={previousMonth}
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#8B5CF6';
                    e.target.style.background = 'rgba(139, 92, 246, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = 'white';
                  }}
                >
                  <ChevronLeft size={20} color="#6B7280" />
                </button>
                <button
                  onClick={nextMonth}
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#8B5CF6';
                    e.target.style.background = 'rgba(139, 92, 246, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = 'white';
                  }}
                >
                  <ChevronRight size={20} color="#6B7280" />
                </button>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, idx) => (
                <div key={idx} style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#9CA3AF',
                  padding: '8px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {day}
                </div>
              ))}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '8px'
            }}>
              {Array.from({ length: startingDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} style={{ padding: '8px' }} />
              ))}
              
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const isTodayDate = isToday(day);
                const hasEvent = isEventDay(day);
                
                return (
                  <div
                    key={day}
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: isTodayDate ? '800' : '600',
                      color: isTodayDate ? 'white' : hasEvent ? '#8B5CF6' : '#1F2937',
                      background: isTodayDate 
                        ? 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                        : hoveredDay === day 
                        ? 'rgba(139, 92, 246, 0.1)' 
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: hasEvent && !isTodayDate ? '2px solid #DDD6FE' : '2px solid transparent',
                      position: 'relative',
                      boxShadow: isTodayDate ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      setHoveredDay(day);
                      if (!isTodayDate) {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      setHoveredDay(null);
                      if (!isTodayDate) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    {day}
                    {hasEvent && !isTodayDate && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#8B5CF6'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
              borderRadius: '14px',
              fontSize: '13px',
              color: '#6B7280',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#8B5CF6'
              }} />
              <span style={{ fontWeight: '600' }}>Events marked with dots</span>
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {/* Weekly Activity */}
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '28px',
            border: '2px solid #F3F4F6',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1F2937' }}>
                Weekly Activity
              </h3>
              <BarChart3 size={22} color="#8B5CF6" />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '180px',
              gap: '10px'
            }}>
              {weeklyActivity.map((day, idx) => {
                const height = (day.hours / maxHours) * 100;
                const isTodayBar = idx === new Date().getDay();
                
                return (
                  <div key={idx} style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      width: '100%',
                      height: `${height}%`,
                      background: isTodayBar 
                        ? 'linear-gradient(180deg, #8B5CF6 0%, #A78BFA 100%)'
                        : 'linear-gradient(180deg, #DDD6FE 0%, #E9D5FF 100%)',
                      borderRadius: '10px 10px 6px 6px',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      minHeight: '30px',
                      boxShadow: isTodayBar ? '0 4px 15px rgba(139, 92, 246, 0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(180deg, #8B5CF6 0%, #A78BFA 100%)';
                      e.currentTarget.style.transform = 'scaleY(1.08) scaleX(1.05)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isTodayBar 
                        ? 'linear-gradient(180deg, #8B5CF6 0%, #A78BFA 100%)'
                        : 'linear-gradient(180deg, #DDD6FE 0%, #E9D5FF 100%)';
                      e.currentTarget.style.transform = 'scaleY(1) scaleX(1)';
                      e.currentTarget.style.boxShadow = isTodayBar ? '0 4px 15px rgba(139, 92, 246, 0.3)' : 'none';
                    }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '-28px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '13px',
                        fontWeight: '800',
                        color: isTodayBar ? '#8B5CF6' : '#6B7280',
                        background: 'white',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap'
                      }}>
                        {day.hours}h
                      </div>
                    </div>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: isTodayBar ? '800' : '600',
                      color: isTodayBar ? '#8B5CF6' : '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events */}
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '28px',
            border: '2px solid #F3F4F6',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1F2937' }}>
                Upcoming Tasks
              </h3>
              <Calendar size={22} color="#8B5CF6" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {upcomingEvents.map((event, idx) => {
                const typeColors = {
                  urgent: { bg: '#FEE2E2', border: '#FCA5A5', dot: '#EF4444', shadow: 'rgba(239, 68, 68, 0.2)' },
                  important: { bg: '#FEF3C7', border: '#FCD34D', dot: '#F59E0B', shadow: 'rgba(245, 158, 11, 0.2)' },
                  deadline: { bg: '#DBEAFE', border: '#93C5FD', dot: '#3B82F6', shadow: 'rgba(59, 130, 246, 0.2)' },
                  regular: { bg: '#F3F4F6', border: '#E5E7EB', dot: '#6B7280', shadow: 'rgba(107, 114, 128, 0.2)' }
                };
                const colors = typeColors[event.type] || typeColors.regular;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      background: colors.bg,
                      border: `2px solid ${colors.border}`,
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(6px) scale(1.02)';
                      e.currentTarget.style.boxShadow = `0 8px 20px ${colors.shadow}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: colors.dot,
                      flexShrink: 0,
                      animation: event.type === 'urgent' ? 'pulse 2s ease-in-out infinite' : 'none'
                    }} />
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#1F2937',
                        lineHeight: '1.4'
                      }}>
                        {event.title}
                      </p>
                      <p style={{
                        margin: '4px 0 0',
                        fontSize: '13px',
                        color: '#6B7280',
                        fontWeight: '500'
                      }}>
                        {event.date} at {event.time}
                      </p>
                    </div>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Insights */}
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '28px',
            border: '2px solid #F3F4F6',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1F2937' }}>
                AI Insights
              </h3>
              <Award size={22} color="#8B5CF6" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {userData.insights.length > 0 ? (
                userData.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px 18px',
                      background: 'linear-gradient(135deg, #F3E8FF 0%, #FAF5FF 100%)',
                      borderRadius: '14px',
                      borderLeft: '4px solid #8B5CF6',
                      animation: 'slideIn 0.5s ease-out',
                      animationDelay: `${idx * 0.1}s`,
                      animationFillMode: 'both'
                    }}
                  >
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: '#1F2937',
                      lineHeight: '1.6',
                      fontWeight: '500'
                    }}>
                      {insight}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#9CA3AF'
                }}>
                  <BookOpen size={36} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                    Complete more courses to get personalized insights
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          padding: '24px',
          background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
          borderRadius: '20px',
          textAlign: 'center',
          border: '2px solid #E5E7EB'
        }}>
          <p style={{
            margin: 0,
            color: '#6B7280',
            fontSize: '14px',
            lineHeight: '1.8',
            fontWeight: '500'
          }}>
            📊 Data updated in real-time • Last sync: {getFormattedTime()}
            <br />
            <small style={{ color: '#9CA3AF', fontSize: '13px' }}>
              Keep learning to improve your success rate and unlock new courses!
            </small>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.02); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 4px 15px rgba(245, 158, 11, 0.25); }
          50% { box-shadow: 0 8px 30px rgba(245, 158, 11, 0.45); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}