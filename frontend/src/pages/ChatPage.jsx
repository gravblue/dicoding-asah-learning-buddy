import { useEffect, useState, useRef } from "react";
import ChatBubble from "../components/ChatBubble";
import JobDetectionCard from "../components/JobDetectionCard";
import { Backend } from "../lib/backend";

export default function ChatPage({ compact = false }) {
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showJobDetection, setShowJobDetection] = useState(false);
  const [personalLearning, setPersonalLearning] = useState(null);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [awaitingStrategyQuery, setAwaitingStrategyQuery] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = () => {
    Backend.listConversations().then((list) => {
      setConvs(list);
      if (!list.length) {
        setActive(null);
        setMessages([]);
        return;
      }
      const stillActive = list.find((item) => item.id === active);
      if (!stillActive) {
        const nextId = list[0].id;
        setActive(nextId);
        Backend.getMessages(nextId).then(setMessages).catch(() => setMessages([]));
      }
    }).catch((err) => {
      console.error("Error loading conversations:", err);
      setConvs([]);
    });
  };

  const removeConversation = async (cid) => {
    const ok = window.confirm("Hapus percakapan ini?");
    if (!ok) return;
    try {
      await Backend.deleteConversation(cid);
      setConvs((prev) => prev.filter((c) => c.id !== cid));
      if (active === cid) {
        setActive(null);
        setMessages([]);
      }
      loadConversations();
    } catch (e) {
      console.error("Error deleting conversation:", e);
      alert("Gagal menghapus percakapan");
    }
  };

  const loadPersonalLearning = async (showLoading = true) => {
    if (showLoading) setLoadingPersonal(true);
    setPersonalError(null);
    
    try {
      console.log("Fetching personal learning data...");
      const data = await Backend.getMyLearningRecommendation();
      console.log("Personal Learning Loaded:", data);
      
      if (data && data.status === "ok") {
        setPersonalLearning(data);
        setPersonalError(null);
        
        if (data.name) {
          setUserName(data.name);
          console.log("Name from API:", data.name);
        }
        if (data.email) {
          setUserEmail(data.email);
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Failed to load personal learning:", error);
      const errorMsg = error.message || "Unknown error";
      setPersonalError(errorMsg);
      setPersonalLearning(null);
    } finally {
      if (showLoading) setLoadingPersonal(false);
    }
  };

  useEffect(() => {
    try {
      const authData = localStorage.getItem('lb_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        setUserEmail(parsed.email || "");
        console.log("Email loaded:", parsed.email);
      }
    } catch (e) {
      console.error("Error loading auth data:", e);
    }

    loadConversations();
    
    Backend.onboardingProfile()
      .then((profileData) => {
        setProfile(profileData);
        if (profileData && profileData.name) {
          setUserName(profileData.name);
          console.log("Name from profile:", profileData.name);
        }
      })
      .catch(() => setProfile(null));
    
    setTimeout(() => {
      loadPersonalLearning(true);
    }, 500);
  }, []);

  const openConv = async (cid) => {
    setActive(cid);
    try { 
      const msgs = await Backend.getMessages(cid); 
      setMessages(msgs); 
    } catch (err) {
      console.error("Error loading messages:", err);
      setMessages([]); 
    }
  };

  const newConversation = async () => {
    try {
      const { id } = await Backend.createConversation("Obrolan baru");
      await openConv(id);
      setConvs((c) => [{ id, title: "Obrolan baru" }, ...c]);
      return id;
    } catch (err) {
      console.error("Error creating conversation:", err);
      alert("Gagal membuat percakapan baru");
      return null;
    }
  };

  const handleJobDetection = (data) => {
    let summaryText = `Job Role Terdeteksi: ${data.job_role}\n\n`;
    
    if (data.level) {
      summaryText += `Level Kemampuan: ${data.level}\n\n`;
    }
    
    summaryText += `Skills yang Direkomendasikan:\n`;
    
    if (data.results) {
      Object.entries(data.results).forEach(([skill, result]) => {
        summaryText += `${skill}: ${result.correct}/${result.total} (${result.level})\n`;
      });
    } else {
      data.skills.forEach((s, i) => {
        summaryText += `${i + 1}. ${s}\n`;
      });
    }

    if (data.courses && data.courses.length > 0) {
      summaryText += `\n\nRekomendasi Course untuk Anda:\n\n`;
      data.courses.slice(0, 5).forEach((course, idx) => {
        summaryText += `${idx + 1}. ${course.course_name}\n`;
        summaryText += `   Level: ${course.course_level}\n`;
        if (course.course_price) {
          summaryText += `   Harga: Rp ${course.course_price.toLocaleString()}\n`;
        }
        summaryText += `\n`;
      });
      
      summaryText += `\nKlik "Mulai" di Dashboard untuk menyimpan progress Anda!`;
    } else {
      summaryText += `\n\nIngin rekomendasi course yang lebih spesifik? Tanyakan saja!`;
    }
    
    send(summaryText);
    setShowJobDetection(false);
  };

  const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handlePersonalLearningPrompt = async () => {
    if (!personalLearning) {
      setMessages((m) => [...m, { role: "bot", text: "Sedang memuat data personal learning Anda..." }]);
      await loadPersonalLearning(false);
      
      if (!personalLearning) {
        let errorMessage = "Maaf, data personal learning belum tersedia.";
        setMessages((m) => [...m, { role: "bot", text: errorMessage }]);
        return;
      }
    }

    let summaryText = `Halo ${userName || 'Learner'}!\n\n`;
    summaryText += `Skills yang Sudah Berkembang:\n`;
    
    if (personalLearning.current_skills && personalLearning.current_skills.length > 0) {
      personalLearning.current_skills.forEach((skill, idx) => {
        const capitalizedSkill = capitalizeFirstLetter(skill);
        summaryText += `${idx + 1}. ${capitalizedSkill}\n`;
      });
      summaryText += `\n`;
    } else {
      summaryText += `Belum ada skill tercatat.\n\n`;
    }

    setMessages((m) => [...m, { role: "bot", text: summaryText }]);
  };

  const handleMyRoadmap = async () => {
  setMessages((m) => [...m, { role: "bot", text: "Sedang memuat roadmap Anda..." }]);

  try {
    const data = await Backend.getMyRoadmap();

    if (data.status !== "ok") {
      setMessages((m) => {
        const newMessages = [...m];
        newMessages[newMessages.length - 1] = {
          role: "bot",
          text: "Maaf, roadmap tidak tersedia saat ini."
        };
        return newMessages;
      });
      return;
    }

    // HEADER 
    let roadmapText = `Roadmap Diperbarui untuk ${data.user_name}\n\n`;

    if (Array.isArray(data.roadmap) && data.roadmap.length > 0) {
      data.roadmap.forEach((item, idx) => {
        let statusDisplay = "";

        if (item.status === "Completed") {
          statusDisplay = "✅ (Completed)";
        } else if (item.status === "In Progress") {
          statusDisplay = `🔄 (In Progress - ${item.progress}%)`;
        } else {
          statusDisplay = "🔒 (Locked)";
        }

        roadmapText += `${idx + 1}. ${item.title} ${statusDisplay}\n`;
      });
    } else {
      roadmapText += `Belum ada modul roadmap yang tersedia.\n`;
    }

    // FOOTER
    roadmapText += `\nTerus belajar untuk unlock modul berikutnya!`;

    setMessages((m) => {
      const newMessages = [...m];
      newMessages[newMessages.length - 1] = {
        role: "bot",
        text: roadmapText
      };
      return newMessages;
    });

  } catch (error) {
    console.error("Failed to get roadmap:", error);
    setMessages((m) => {
      const newMessages = [...m];
      newMessages[newMessages.length - 1] = {
        role: "bot",
        text: "Maaf, terjadi kesalahan saat mengambil roadmap."
      };
      return newMessages;
    });
  }
};


  const handleLearningStrategy = async () => {
    const botMessage = "Baik! Sebutkan query Anda untuk strategi belajar.\n\nContoh:\n- \"Sehabis HTML, CSS apa lagi yang harus dipelajari?\"\n- \"Sehabis JavaScript, apa lagi yang harus dipelajari untuk jadi Front-End Developer?\"\n- \"Sehabis React, apa lagi yang harus dipelajari untuk jadi React Developer?\"";
    
    send(botMessage);
    setAwaitingStrategyQuery(true);
  };

  const handleWeeklyStudyPlan = async () => {
    setMessages((m) => [...m, { role: "bot", text: "Sedang membuat weekly study plan untuk Anda..." }]);
    
    try {
      const data = await Backend.getMyWeeklyStudyPlan(4);
      
      if (data.status === "no_data") {
        setMessages((m) => {
          const newMessages = [...m];
          newMessages[newMessages.length - 1] = { role: "bot", text: data.message || "Anda belum memiliki progress course." };
          return newMessages;
        });
        return;
      }
      
      let summaryText = `Hai ${userName || 'Learner'}!\n\n`;
      summaryText += `Berikut Weekly Study Plan Kamu:\n`;
      
      if (!data.has_recommendations) {
        summaryText += `Tidak ada rekomendasi`;
      } else {
        data.weekly_plan.forEach((plan) => {
          const hours = plan.hours ? ` (${plan.hours})` : "";
          summaryText += `Minggu ${plan.week}: ${plan.course_name} (${plan.difficulty})${hours}\n`;
        });
      }
      
      setMessages((m) => {
        const newMessages = [...m];
        newMessages[newMessages.length - 1] = { role: "bot", text: summaryText };
        return newMessages;
      });
      
    } catch (error) {
      console.error("Failed to get weekly study plan:", error);
      setMessages((m) => {
        const newMessages = [...m];
        newMessages[newMessages.length - 1] = { role: "bot", text: "Maaf, terjadi kesalahan saat mengambil weekly study plan." };
        return newMessages;
      });
    }
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Yakin ingin keluar?");
    if (confirmLogout) {
      localStorage.removeItem('lb_auth');
      window.location.href = '/';
    }
  };

  const handleGoToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const send = async (customText) => {
    const raw = typeof customText === "string" ? customText : input;
    const text = raw.trim();
    if (!text) return;
    if (typeof customText !== "string") setInput("");
    
    let cid = active;
    if (!cid) {
      cid = await newConversation();
      if (!cid) return;
    }
    
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    
    try {
      if (awaitingStrategyQuery && typeof customText !== "string") {
        console.log("User input query:", text);
        
        setMessages((m) => [...m, { role: "bot", text: "Sedang menganalisis query dan membuat strategi belajar..." }]);
        
        const strategyData = await Backend.generateStrategyFromQuery(text);
        
        console.log("Strategy data received:", strategyData);

      if (strategyData.status === "ok") {
      // Langsung tampilkan isi strategi aja, tanpa header-header
        const summaryText = strategyData.strategy;
        setMessages((m) => [...m, { role: "bot", text: summaryText }]);
        setAwaitingStrategyQuery(false);
        setLoading(false);
        return;
      }
      }
      
      const reply = await Backend.sendMessage(cid, text);
      setMessages((m) => [...m, { role: "bot", text: reply }]);
      setConvs((list) => list.map((item) => {
        if (item.id === cid && item.title.toLowerCase().startsWith("obrolan baru")) {
          return { ...item, title: text.slice(0, 40) };
        }
        return item;
      }));
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((m) => [...m, { role: "bot", text: "(Offline) Baik, saya catat." }]);
    } finally { 
      setLoading(false); 
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      send(); 
    }
  };

  const suggestionPrompts = personalLearning ? [
    {
      text: "Skill apa yang sudah berkembang?",
      action: "personal",
      icon: "📊"
    },
    {
      text: "Buatkan strategi belajar untuk saya",
      action: "strategy",
      icon: "🎯"
    },
    {
      text: "Tampilkan weekly study plan saya",
      action: "weekly",
      icon: "📅"
    },
    {
      text: "Tampilkan roadmap belajar saya",
      action: "roadmap",
      icon: "🗺️"
    }
  ] : [
    {
      text: "Skill apa yang sudah berkembang?",
      action: "personal",
      icon: "📊"
    },
    {
      text: "Buatkan strategi belajar untuk saya",
      action: "strategy",
      icon: "🎯"
    },
    {
      text: "Tampilkan weekly study plan saya",
      action: "weekly",
      icon: "📅"
    },
    {
      text: "Tampilkan roadmap belajar saya",
      action: "roadmap",
      icon: "🗺️"
    }
  ];

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 6px 24px rgba(99, 102, 241, 0.25);
          }
          50% {
            box-shadow: 0 10px 36px rgba(99, 102, 241, 0.45);
          }
        }

        .chat-shell-modern {
          display: grid;
          grid-template-columns: 380px 1fr;
          width: 100%;
          max-width: 100%;
          margin: 0;
          background: #ffffff;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
          height: 100vh;
          border: none;
        }

        .sidebar-modern {
          background: #ffffff;
          padding: 28px 0;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          position: relative;
          border-right: 1px solid #d1d5db;
          box-shadow: 4px 0 16px rgba(0, 0, 0, 0.03);
        }

        .sidebar-header {
          padding: 0 24px 24px;
          border-bottom: 1px solid rgba(209, 213, 219, 0.5);
          margin-bottom: 24px;
          position: relative;
          z-index: 1;
        }

        .profile-section {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 18px;
          margin-bottom: 24px;
          border: 1.5px solid rgba(209, 213, 219, 0.6);
          transition: all 0.3s ease;
          backdrop-filter: blur(8px);
        }

        .profile-section:hover {
          background: rgba(255, 255, 255, 0.9);
          border-color: #6366f1;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.15);
        }

        .profile-avatar {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #ffffff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 24px;
          box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35);
          flex-shrink: 0;
          position: relative;
        }

        .profile-avatar::after {
          content: '';
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          background: #10b981;
          border-radius: 50%;
          border: 2.5px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.6);
        }

        .profile-info {
          flex: 1;
          min-width: 0;
        }

        .profile-name {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-email {
          font-size: 13px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
        }

        .nav-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }

        .nav-btn {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 14px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .nav-btn.dashboard {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
        }

        .nav-btn.dashboard:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
        }

        .nav-btn.logout {
          background: rgba(255, 255, 255, 0.6);
          color: #ef4444;
          border: 1.5px solid rgba(239, 68, 68, 0.2);
        }

        .nav-btn.logout:hover {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
        }

        .sidebar-header h3 {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          margin: 0 0 18px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .new-chat-btn, .job-detect-btn {
          width: 100%;
          padding: 14px 18px;
          color: white;
          border: none;
          border-radius: 14px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          margin-bottom: 12px;
        }

        .new-chat-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
        }

        .new-chat-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
        }

        .job-detect-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
        }

        .job-detect-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
        }

        .conversation-list {
          padding: 0 20px;
          flex: 1;
          overflow-y: auto;
        }

        .conversation-section-title {
          font-size: 11px;
          font-weight: 700;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 18px 14px 12px;
        }

        .conversation-item {
          padding: 14px 16px;
          margin-bottom: 8px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: rgba(255, 255, 255, 0.4);
          border: 1.5px solid transparent;
        }

        .conversation-item:hover {
          background: rgba(255, 255, 255, 0.7);
          border-color: rgba(99, 102, 241, 0.25);
          transform: translateX(4px);
          box-shadow: 0 3px 12px rgba(99, 102, 241, 0.12);
        }

        .conversation-item.active {
          background: rgba(99, 102, 241, 0.12);
          border-color: rgba(99, 102, 241, 0.4);
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.2);
        }

        .conversation-title {
          flex: 1;
          font-size: 14px;
          color: #374151;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .conversation-item.active .conversation-title {
          color: #4f46e5;
          font-weight: 700;
        }

        .delete-btn {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-size: 20px;
          font-weight: 700;
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          transform: scale(1.1);
        }

        .chat-area-modern {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          height: 100%;
          overflow: hidden;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: #ffffff;
        }

        .welcome-container {
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .welcome-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .welcome-avatar-large {
          width: 110px;
          height: 110px;
          margin: 0 auto 24px;
          border-radius: 32px;
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #ffffff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 46px;
          box-shadow: 0 18px 50px rgba(99, 102, 241, 0.35);
          animation: float 3s ease-in-out infinite;
          position: relative;
        }

        .welcome-avatar-large::after {
      content: '👋';
      position: absolute;
      bottom: -6px;
      right: -6px;
      width: 42px;
      height: 42px;
      background: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .welcome-title {
      font-size: 38px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 14px;
      background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #ffffff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
    }

    .welcome-subtitle {
      font-size: 16px;
      color: #64748b;
      font-weight: 500;
      line-height: 1.6;
    }

    .quick-action-banner {
      background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
      border: 2px solid #e9d5ff;
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 6px 18px rgba(139, 92, 246, 0.08);
    }

    .quick-action-icon {
      font-size: 42px;
    }

    .quick-action-content {
      flex: 1;
    }

    .quick-action-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 7px;
    }

    .quick-action-desc {
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
      font-weight: 500;
    }

    .quick-action-btn {
      padding: 12px 24px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
      white-space: nowrap;
    }

    .quick-action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }

    .quick-action-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .suggestion-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 28px;
    }

    .suggestion-card {
      padding: 20px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 2px solid #e2e8f0;
      border-radius: 18px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: left;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.04);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .suggestion-card-icon {
      font-size: 32px;
      flex-shrink: 0;
    }

    .suggestion-card-text {
      font-size: 14px;
      color: #1e293b;
      font-weight: 600;
      line-height: 1.4;
    }

    .suggestion-card:hover {
      border-color: #c7d2fe;
      background: #ffffff;
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.12);
    }

    .chat-input-container {
      padding: 0 px;
      background: transparent;
      border-top: none;
      flex-shrink: 0;
      box-shadow: none;
    }

    .chat-input-wrapper {
      max-width: 1000px;
      margin: 20px auto;
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }

    .chat-textarea {
      flex: 1;
      padding: 16px 22px;
      border: 2px solid #e2e8f0;
      border-radius: 20px;
      font-size: 15px;
      font-family: inherit;
      resize: none;
      outline: none;
      transition: all 0.3s ease;
      background: #fafafa;
      min-height: 54px;
      max-height: 180px;
      line-height: 1.5;
      font-weight: 500;
      color: #1e293b;
    }

    .chat-textarea::placeholder {
      color: #94a3b8;
      font-weight: 500;
    }

    .chat-textarea:focus {
      border-color: #6366f1;
      background: white;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1), 0 4px 16px rgba(99, 102, 241, 0.08);
    }

    .send-button {
      width: 54px;
      height: 54px;
      border-radius: 18px;
      border: none;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      font-size: 22px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px rgba(99, 102, 241, 0.3);
    }

    .send-button:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 8px 26px rgba(99, 102, 241, 0.45);
    }

    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading-dots {
      display: flex;
      gap: 5px;
      align-items: center;
      justify-content: center;
    }

    .loading-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: white;
      animation: pulse 1.4s ease-in-out infinite;
    }

    .loading-dot:nth-child(1) { animation-delay: 0s; }
    .loading-dot:nth-child(2) { animation-delay: 0.2s; }
    .loading-dot:nth-child(3) { animation-delay: 0.4s; }

    .empty-state {
      text-align: center;
      padding: 28px;
      color: #718096;
      font-size: 14px;
      line-height: 1.6;
      font-weight: 500;
    }

    @media (max-width: 1024px) {
      .chat-shell-modern {
        grid-template-columns: 1fr;
      }
      
      .sidebar-modern {
        display: none;
      }

      .suggestion-grid {
        grid-template-columns: 1fr;
      }

      .quick-action-banner {
        flex-direction: column;
        text-align: center;
      }

      .quick-action-btn {
        width: 100%;
      }

      .chat-messages {
        padding: 20px;
      }

      .welcome-title {
        font-size: 28px;
      }

      .welcome-subtitle {
        font-size: 14px;
      }

      .welcome-avatar-large {
        width: 80px;
        height: 80px;
        font-size: 34px;
      }
    }

    .conversation-list::-webkit-scrollbar,
    .chat-messages::-webkit-scrollbar {
      width: 6px;
    }

    .conversation-list::-webkit-scrollbar-track,
    .chat-messages::-webkit-scrollbar-track {
      background: rgba(209, 213, 219, 0.3);
      border-radius: 3px;
    }

    .conversation-list::-webkit-scrollbar-thumb,
    .chat-messages::-webkit-scrollbar-thumb {
      background: rgba(156, 163, 175, 0.4);
      border-radius: 3px;
    }

    .conversation-list::-webkit-scrollbar-thumb:hover,
    .chat-messages::-webkit-scrollbar-thumb:hover {
      background: rgba(156, 163, 175, 0.6);
    }
  `}</style>

  <div className="chat-shell-modern" role="main">
    {!compact && (
      <aside className="sidebar-modern">
        <div className="sidebar-header">
          <div className="profile-section">
            <div className="profile-avatar">
              {userName ? userName.charAt(0).toUpperCase() : userEmail ? userEmail.charAt(0).toUpperCase() : 'L'}
            </div>
            <div className="profile-info">
              <div className="profile-name">
                {userName || 'Learning Buddy User'}
              </div>
              <div className="profile-email">
                {userEmail || 'user@learningbuddy.com'}
              </div>
            </div>
          </div>

          <div className="nav-buttons">
            <button className="nav-btn dashboard" onClick={handleGoToDashboard}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="14" y="3" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="14" y="14" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="3" y="14" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Dashboard
            </button>
            <button className="nav-btn logout" onClick={handleLogout}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Keluar
            </button>
          </div>

          <h3>LEARNING BUDDY</h3>
          <button className="new-chat-btn" onClick={newConversation}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Obrolan Baru
          </button>
          <button className="job-detect-btn" onClick={() => setShowJobDetection(true)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Deteksi Job Role
          </button>
        </div>

        <div className="conversation-list">
          <div className="conversation-section-title">
            RIWAYAT OBROLAN
          </div>
          
          {convs.length === 0 ? (
            <div className="empty-state">
              Belum ada percakapan.<br/>Mulai obrolan baru!
            </div>
          ) : (
            convs.map((c) => (
              <div
                key={c.id}
                className={`conversation-item ${c.id === active ? 'active' : ''}`}
                onClick={() => openConv(c.id)}
              >
                <span className="conversation-title">
                  {c.title || `Obrolan #${c.id}`}
                </span>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeConversation(c.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    )}

    <section className="chat-area-modern">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="welcome-container">
            <div className="welcome-header">
              <div className="welcome-avatar-large">
                {userName ? userName.charAt(0).toUpperCase() : userEmail ? userEmail.charAt(0).toUpperCase() : 'L'}
              </div>
              <h1 className="welcome-title">
                {userName ? `Halo ${userName}!` : "Selamat Datang!"}
              </h1>
              <p className="welcome-subtitle">
                {personalLearning 
                  ? `Saya sudah menyiapkan rekomendasi learning path khusus untuk Anda!`
                  : "Tanyakan apapun tentang pembelajaran Dicoding. Saya siap membantu!"}
              </p>
            </div>

            {loadingPersonal ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <div className="loading-dots" style={{ justifyContent: 'center', marginBottom: '18px' }}>
                  <div className="loading-dot" style={{ background: '#10b981' }}></div>
                  <div className="loading-dot" style={{ background: '#10b981' }}></div>
                  <div className="loading-dot" style={{ background: '#10b981' }}></div>
                </div>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>Memuat data personal learning Anda...</p>
              </div>
            ) : personalLearning ? (
              <div className="quick-action-banner" style={{
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                border: '2px solid #6ee7b7',
                boxShadow: '0 8px 22px rgba(16, 185, 129, 0.12)'
              }}>
                <div className="quick-action-icon">✨</div>
                <div className="quick-action-content">
                  <div className="quick-action-title" style={{ color: '#065f46' }}>Personal Learning Assistant Aktif!</div>
                  <div className="quick-action-desc" style={{ color: '#047857' }}>
                    Klik untuk melihat skill yang sudah berkembang berdasarkan progress belajar Anda
                  </div>
                </div>
                <button 
                  className="quick-action-btn"
                  onClick={handlePersonalLearningPrompt}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.3)';
                  }}
                >
                  Lihat Progress Saya
                </button>
              </div>
            ) : (
              <div className="quick-action-banner">
                <div className="quick-action-icon">🚀</div>
                <div className="quick-action-content">
                  <div className="quick-action-title">Temukan Job Role Idealmu!</div>
                  <div className="quick-action-desc">
                    Dapatkan rekomendasi job role dan skills yang sesuai dengan minatmu
                  </div>
                </div>
                <button 
                  className="quick-action-btn"
                  onClick={() => setShowJobDetection(true)}
                >
                  Mulai Deteksi
                </button>
              </div>
            )}

            <div className="suggestion-grid">
              {suggestionPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  className="suggestion-card"
                  onClick={() => {
                    if (prompt.action === "personal") {
                      handlePersonalLearningPrompt();
                    } else if (prompt.action === "weekly") {
                      handleWeeklyStudyPlan();
                    } else if (prompt.action === "strategy") {
                      handleLearningStrategy();
                    } else if (prompt.action === "roadmap") {
                      handleMyRoadmap();
                    } else {
                      send(prompt.text);
                    }
                  }}
                >
                  <div className="suggestion-card-icon">{prompt.icon}</div>
                  <div className="suggestion-card-text">{prompt.text}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: "850px", margin: "0 auto" }}>
            {messages.map((m, i) => (
              <div key={i}>
                <ChatBubble role={m.role} text={m.text} />
              </div>
            ))}
            {loading && (
              <div style={{
                padding: '16px 20px',
                background: 'white',
                borderRadius: '18px',
                width: 'fit-content',
                boxShadow: '0 3px 12px rgba(99, 102, 241, 0.08)',
                border: '1.5px solid #e0e7ff'
              }}>
                <div className="loading-dots">
                  <div className="loading-dot" style={{ background: '#6366f1' }}></div>
                  <div className="loading-dot" style={{ background: '#6366f1' }}></div>
                  <div className="loading-dot" style={{ background: '#6366f1' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            className="chat-textarea"
            rows={1}
            placeholder="Tanyakan pada kami..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
            }}
            onKeyDown={onKey}
          />
          <button
            className="send-button"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            aria-label="Kirim"
          >
            {loading ? (
              <div className="loading-dots">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </section>
  </div>

  {showJobDetection && (
    <JobDetectionCard
      onDetect={handleJobDetection}
      onClose={() => setShowJobDetection(false)}
    />
  )}
</>
);
}
