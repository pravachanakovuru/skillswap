
import React, { useEffect, useState } from "react";
import "./App.css";

const API = "https://skillswap-51yh.onrender.com";

function App() {
  const [page, setPage] = useState("home");

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const [login, setLogin] = useState({
    email: "",
    password: ""
  });

  const [loginLoading, setLoginLoading] = useState(false);

  const [register, setRegister] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [skillForm, setSkillForm] = useState({
    skill_name: "",
    skill_type: "Teach",
    description: "",
    teaching_mode: "FREE",
    skill_level: "BEGINNER"
  });

  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [exploreSkills, setExploreSkills] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreSearch, setExploreSearch] = useState("");

  // SAFE JSON RESPONSE
  const getResponseData = async (response) => {
    const text = await response.text();

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error("Invalid server response. Please try again.");
    }
  };

  // LOGIN FUNCTION - UPDATED
  const handleLogin = async (e) => {
    e.preventDefault();

    if (loginLoading) return;

    if (!login.email.trim() || !login.password) {
      alert("Please enter email and password.");
      return;
    }

    setLoginLoading(true);

    try {
      console.log("Connecting to SkillSwap backend...");

      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: login.email.trim(),
          password: login.password
        })
      });

      const data = await getResponseData(response);

      console.log("Login response:", response.status, data);

      if (!response.ok) {
        alert(data.message || "Invalid email or password.");
        return;
      }

      if (!data.token || !data.user) {
        throw new Error("Login response is missing user or token.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUser(data.user);

      setLogin({
        email: "",
        password: ""
      });

      setPage("dashboard");

      alert("Welcome to SkillSwap!");

    } catch (error) {
      console.error("Login error:", error);

      alert(
        error.message === "Failed to fetch"
          ? "Cannot connect to backend. Please check your internet or backend server."
          : error.message || "Something went wrong during login."
      );

    } finally {
      setLoginLoading(false);
    }
  };

  // REGISTER FUNCTION
  const handleRegister = async (e) => {
    e.preventDefault();

    if (register.password !== register.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: register.name,
          email: register.email,
          password: register.password
        })
      });

      const data = await getResponseData(response);

      if (!response.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      alert("Account created successfully! Please login.");

      setRegister({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
      });

      setPage("login");

    } catch (error) {
      console.error(error);
      alert(error.message || "Cannot connect to backend.");
    }
  };

  // GET MY SKILLS
  const fetchSkills = async () => {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API}/api/skills`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to load skills");
      }

      setSkills(Array.isArray(data) ? data : []);

    } catch (error) {
      setMessage(error.message);

    } finally {
      setLoading(false);
    }
  };

  // GET PUBLIC TEACHING SKILLS
  const fetchExploreSkills = async () => {
    try {
      setExploreLoading(true);

      const response = await fetch(`${API}/api/skills/public`, {
        cache: "no-store"
      });

      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to load public skills");
      }

      setExploreSkills(Array.isArray(data) ? data : []);

    } catch (error) {
      console.error("Explore error:", error.message);
    } finally {
      setExploreLoading(false);
    }
  };

  // LOAD DATA WHEN PAGE CHANGES
  useEffect(() => {
    if (page === "dashboard" && user) {
      fetchSkills();
    }

    if (page === "explore") {
      fetchExploreSkills();
    }
  }, [page, user]);

  // ADD SKILL
  const handleAddSkill = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first!");
      setPage("login");
      return;
    }

    try {
      const response = await fetch(`${API}/api/skills`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(skillForm)
      });

      const data = await getResponseData(response);

      if (!response.ok) {
        alert(data.message || "Could not add skill");
        return;
      }

      alert("Skill added successfully!");

      setSkillForm({
        skill_name: "",
        skill_type: "Teach",
        description: "",
        teaching_mode: "FREE",
        skill_level: "BEGINNER"
      });

      setMessage("");

      await fetchSkills();
      await fetchExploreSkills();

    } catch (error) {
      console.error(error);
      alert(error.message || "Cannot connect to backend.");
    }
  };

  // DELETE SKILL
  const handleDeleteSkill = async (id) => {
    if (!window.confirm("Are you sure you want to delete this skill?")) {
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API}/api/skills/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await getResponseData(response);

      if (!response.ok) {
        alert(data.message || "Delete failed");
        return;
      }

      setSkills((previous) =>
        previous.filter((skill) => skill.userSkillId !== id)
      );

      await fetchExploreSkills();

      alert("Skill deleted successfully!");

    } catch (error) {
      console.error(error);
      alert(error.message || "Cannot connect to backend.");
    }
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setSkills([]);
    setExploreSkills([]);
    setPage("home");
  };

  // HOME CATEGORY DATA
  const categories = [
    {
      icon: "💻",
      name: "Web Development",
      description: "Build websites and learn modern technologies.",
      category: "Technology",
      subskills: [
        "HTML", "CSS", "JavaScript", "React.js", "Node.js",
        "Express.js", "MySQL", "Bootstrap",
        "Frontend Development", "Backend Development"
      ]
    },
    {
      icon: "🎨",
      name: "Graphic Design",
      description: "Turn your creative ideas into beautiful designs.",
      category: "Creative",
      subskills: [
        "Canva", "Adobe Photoshop", "Illustrator", "Figma",
        "Logo Design", "UI Design", "Poster Design",
        "Typography", "Branding"
      ]
    },
    {
      icon: "📸",
      name: "Photography",
      description: "Capture moments and improve your visual storytelling.",
      category: "Creative",
      subskills: [
        "Portrait Photography", "Nature Photography",
        "Product Photography", "Mobile Photography",
        "Photo Editing", "Lightroom", "Camera Basics",
        "Lighting Techniques"
      ]
    },
    {
      icon: "🎵",
      name: "Music",
      description: "Explore instruments, rhythm and musical creativity.",
      category: "Arts",
      subskills: [
        "Guitar", "Piano", "Keyboard", "Singing",
        "Music Theory", "Drums", "Violin", "Music Production"
      ]
    },
    {
      icon: "🐍",
      name: "Python Programming",
      description: "Start coding and solve problems with Python.",
      category: "Technology",
      subskills: [
        "Python Basics", "OOP", "Data Structures",
        "File Handling", "Django", "Flask", "Data Science",
        "Machine Learning", "Automation"
      ]
    },
    {
      icon: "🗣️",
      name: "Communication",
      description: "Build confidence and improve communication.",
      category: "Personal",
      subskills: [
        "English Speaking", "Public Speaking", "Interview Skills",
        "Presentation Skills", "Group Discussion",
        "Storytelling", "Business Communication", "Leadership"
      ]
    }
  ];

  return (
    <div className="app">

      {/* NAVBAR */}
      <nav className="navbar">

        <h2 className="logo" onClick={() => setPage("home")}>
          Skill<span>Swap.</span>
        </h2>

        <div className="nav-links">
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("explore")}>Explore</button>

          <button
            onClick={() => {
              setPage("home");
              setTimeout(() => {
                document.getElementById("about")?.scrollIntoView({
                  behavior: "smooth"
                });
              }, 100);
            }}
          >
            About
          </button>
        </div>

        <div className="nav-buttons">
          {user ? (
            <>
              <button
                className="btn-outline"
                onClick={() => setPage("dashboard")}
              >
                Dashboard
              </button>

              <button className="btn-primary" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-outline"
                onClick={() => setPage("login")}
              >
                Login
              </button>

              <button
                className="btn-primary"
                onClick={() => setPage("register")}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* HOME PAGE */}
      {page === "home" && (
        <>
          <section className="hero">
            <div className="hero-content">

              <span className="eyebrow">
                ✦ LEARN • SHARE • GROW
              </span>

              <h1>
                Your Skills Are
                <br />
                <span>Worth Sharing.</span>
              </h1>

              <p>
                Discover new talents, share what you know,
                and connect with a community that loves learning.
              </p>

              <div className="hero-buttons">
                <button
                  className="btn-primary hero-btn"
                  onClick={() => setPage(user ? "dashboard" : "register")}
                >
                  Start Your Journey →
                </button>

                <button
                  className="btn-outline hero-btn"
                  onClick={() => setPage("explore")}
                >
                  Explore Skills
                </button>
              </div>

              <div className="hero-note">
                <span>💜</span>
                A community where everyone has something to teach.
              </div>
            </div>

            <div className="hero-art">
              <div className="art-circle">
                <div className="art-emoji">🌱</div>

                <div className="floating-card float-one">💻 Coding</div>
                <div className="floating-card float-two">🎨 Creativity</div>
                <div className="floating-card float-three">📚 Learning</div>
              </div>
            </div>
          </section>

          {/* EXPLORE CATEGORIES */}
          <section className="features section" id="explore">
            <div className="section-heading">
              <span className="eyebrow">FIND YOUR NEXT SKILL</span>
              <h2>Explore <span>Possibilities</span></h2>
              <p>There is always something new to learn.</p>
            </div>

            <div className="skill-container">
              {categories.map((item, index) => (
                <div className="explore-card" key={index}>
                  <div className="explore-icon">{item.icon}</div>

                  <span className="card-category">{item.category}</span>

                  <h3>{item.name}</h3>
                  <p>{item.description}</p>

                  <div className="subskill-list">
                    {item.subskills.map((subskill, subIndex) => (
                      <span className="subskill-tag" key={subIndex}>
                        {subskill}
                      </span>
                    ))}
                  </div>

                  <button onClick={() => setPage("explore")}>
                    Explore Skill →
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="how-section section">
            <div className="section-heading">
              <span className="eyebrow">SIMPLE & FRIENDLY</span>
              <h2>How SkillSwap <span>Works</span></h2>
            </div>

            <div className="steps">
              <div className="step-card">
                <div>01</div>
                <h3>Create an Account</h3>
                <p>Join the community and set up your profile.</p>
              </div>

              <div className="step-card">
                <div>02</div>
                <h3>Share Your Skills</h3>
                <p>Add the skills you can teach or want to learn.</p>
              </div>

              <div className="step-card">
                <div>03</div>
                <h3>Grow Together</h3>
                <p>Connect with others and exchange knowledge.</p>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer id="about">
            <h2>Skill<span>Swap.</span></h2>
            <p>Learn Together. Share Together. Grow Together. 💜</p>
            <p className="footer-small">
              © 2026 SkillSwap. All rights reserved.
            </p>
          </footer>
        </>
      )}

      {/* EXPLORE PAGE */}
      {page === "explore" && (
        <section className="dashboard-page">
          <div className="section-heading">
            <span className="eyebrow">DISCOVER NEW TALENTS</span>
            <h2>Explore <span>Skills ✨</span></h2>
            <p>Learn new skills from other SkillSwap members.</p>
          </div>

          <input
            type="text"
            placeholder="Search for a skill..."
            value={exploreSearch}
            onChange={(e) => setExploreSearch(e.target.value)}
          />

          {exploreLoading ? (
            <p className="empty-state">Loading skills...</p>
          ) : (
            <>
              {exploreSkills.filter((skill) =>
                (skill.skill_name || "")
                  .toLowerCase()
                  .includes(exploreSearch.toLowerCase())
              ).length === 0 ? (
                <div className="empty-state">
                  <div>🌱</div>
                  <h3>No skills found</h3>
                  <p>Ask another member to add a Teach skill!</p>
                </div>
              ) : (
                <div className="skill-container">
                  {exploreSkills
                    .filter((skill) =>
                      (skill.skill_name || "")
                        .toLowerCase()
                        .includes(exploreSearch.toLowerCase())
                    )
                    .map((skill) => (
                      <div
                        className="explore-card"
                        key={skill.id || skill.userSkillId}
                      >
                        <div className="explore-icon">🎓</div>
                        <span className="card-category">TEACHING SKILL</span>
                        <h3>{skill.skill_name}</h3>

                        <p>
                          {skill.description || "Ready to share this skill!"}
                        </p>

                        <p>
                          👤 Teacher: {skill.teacher_name || "SkillSwap Member"}
                        </p>

                        <p>Level: {skill.skill_level}</p>
                        <p>Mode: {skill.teaching_mode}</p>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          <button
            className="back-home"
            onClick={() => setPage(user ? "dashboard" : "home")}
          >
            ← Back
          </button>
        </section>
      )}

      {/* LOGIN PAGE */}
      {page === "login" && (
        <section className="auth-section">
          <div className="auth-card">
            <div className="auth-icon">👋</div>

            <span className="eyebrow">WELCOME BACK</span>

            <h1>Login to SkillSwap</h1>

            <p className="auth-subtitle">
              Continue your learning journey.
            </p>

            <form onSubmit={handleLogin}>
              <label>Email Address</label>

              <input
                type="email"
                placeholder="Enter your email"
                required
                value={login.email}
                onChange={(e) =>
                  setLogin({ ...login, email: e.target.value })
                }
              />

              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                required
                value={login.password}
                onChange={(e) =>
                  setLogin({ ...login, password: e.target.value })
                }
              />

              <button
                type="submit"
                className="btn-primary auth-submit"
                disabled={loginLoading}
              >
                {loginLoading ? "Logging in..." : "Login →"}
              </button>
            </form>

            <p className="auth-switch">
              New to SkillSwap?{" "}
              <span onClick={() => setPage("register")}>
                Create an account
              </span>
            </p>

            <button
              className="back-home"
              onClick={() => setPage("home")}
            >
              ← Back to Home
            </button>
          </div>
        </section>
      )}

      {/* REGISTER PAGE */}
      {page === "register" && (
        <section className="auth-section">
          <div className="auth-card register-card">
            <div className="auth-icon">✨</div>

            <span className="eyebrow">JOIN OUR COMMUNITY</span>

            <h1>Create Account</h1>

            <p className="auth-subtitle">
              Create your account and start sharing skills.
            </p>

            <form onSubmit={handleRegister}>
              <label>Full Name</label>

              <input
                type="text"
                placeholder="Enter your full name"
                required
                value={register.name}
                onChange={(e) =>
                  setRegister({ ...register, name: e.target.value })
                }
              />

              <label>Email Address</label>

              <input
                type="email"
                placeholder="Enter your email"
                required
                value={register.email}
                onChange={(e) =>
                  setRegister({ ...register, email: e.target.value })
                }
              />

              <label>Password</label>

              <input
                type="password"
                placeholder="At least 8 characters"
                minLength="8"
                required
                value={register.password}
                onChange={(e) =>
                  setRegister({ ...register, password: e.target.value })
                }
              />

              <label>Confirm Password</label>

              <input
                type="password"
                placeholder="Re-enter your password"
                minLength="8"
                required
                value={register.confirmPassword}
                onChange={(e) =>
                  setRegister({
                    ...register,
                    confirmPassword: e.target.value
                  })
                }
              />

              <button type="submit" className="btn-primary auth-submit">
                Create Account →
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?{" "}
              <span onClick={() => setPage("login")}>Login</span>
            </p>

            <button
              className="back-home"
              onClick={() => setPage("home")}
            >
              ← Back to Home
            </button>
          </div>
        </section>
      )}

      {/* DASHBOARD */}
      {page === "dashboard" && user && (
        <section className="dashboard-page">
          <div className="dashboard-header">
            <div>
              <span className="eyebrow">YOUR PERSONAL SPACE</span>

              <h1>
                Hello, <span>{user?.name || "Learner"}</span> 👋
              </h1>

              <p>Manage your skills and keep growing every day.</p>
            </div>

            <div className="profile-bubble">💜</div>
          </div>

          {/* PROFILE DETAILS */}
          <div className="profile-strip">
            <div>
              <span className="profile-label">YOUR EMAIL</span>
              <strong>{user?.email}</strong>
            </div>

            <div>
              <span className="profile-label">YOUR SKILLS</span>
              <strong>{skills.length} added</strong>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* ADD SKILL FORM */}
            <div className="add-skill-card">
              <span className="eyebrow">BUILD YOUR PROFILE</span>

              <h2>Add a <span>Skill</span></h2>

              <p className="form-description">
                Tell the community what you can teach or want to learn.
              </p>

              <form onSubmit={handleAddSkill}>
                <label>Skill Name</label>

                <input
                  type="text"
                  placeholder="Example: Java, Python, UI Design"
                  required
                  value={skillForm.skill_name}
                  onChange={(e) =>
                    setSkillForm({
                      ...skillForm,
                      skill_name: e.target.value
                    })
                  }
                />

                <label>Skill Type</label>

                <select
                  value={skillForm.skill_type}
                  onChange={(e) =>
                    setSkillForm({
                      ...skillForm,
                      skill_type: e.target.value
                    })
                  }
                >
                  <option value="Teach">I can Teach</option>
                  <option value="Learn">I want to Learn</option>
                </select>

                <label>Description</label>

                <textarea
                  placeholder="Write a short description..."
                  rows="3"
                  value={skillForm.description}
                  onChange={(e) =>
                    setSkillForm({
                      ...skillForm,
                      description: e.target.value
                    })
                  }
                />

                {skillForm.skill_type === "Teach" && (
                  <>
                    <label>Teaching Mode</label>

                    <select
                      value={skillForm.teaching_mode}
                      onChange={(e) =>
                        setSkillForm({
                          ...skillForm,
                          teaching_mode: e.target.value
                        })
                      }
                    >
                      <option value="FREE">Free</option>
                      <option value="EXCHANGE">Skill Exchange</option>
                    </select>
                  </>
                )}

                <label>Skill Level</label>

                <select
                  value={skillForm.skill_level}
                  onChange={(e) =>
                    setSkillForm({
                      ...skillForm,
                      skill_level: e.target.value
                    })
                  }
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>

                <button type="submit" className="btn-primary auth-submit">
                  + Add My Skill
                </button>
              </form>
            </div>

            {/* MY SKILLS */}
            <div className="my-skills-section">
              <div className="my-skills-heading">
                <div>
                  <span className="eyebrow">YOUR COLLECTION</span>
                  <h2>My <span>Skills</span></h2>
                </div>

                <span className="skill-count">{skills.length}</span>
              </div>

              {message && (
                <p className="error-message">{message}</p>
              )}

              {loading ? (
                <p className="empty-state">Loading your skills...</p>
              ) : skills.length === 0 ? (
                <div className="empty-state">
                  <div>🌱</div>
                  <h3>No skills added yet</h3>
                  <p>Add your first skill using the form.</p>
                </div>
              ) : (
                <div className="my-skill-list">
                  {skills.map((skill) => (
                    <div
                      className="my-skill-card"
                      key={skill.userSkillId}
                    >
                      <div className="my-skill-icon">
                        {skill.skill_type === "Teach" ? "🎓" : "📚"}
                      </div>

                      <div className="my-skill-details">
                        <div className="skill-title-row">
                          <h3>{skill.skill_name}</h3>

                          <span
                            className={
                              skill.skill_type === "Teach"
                                ? "type-badge teach"
                                : "type-badge learn"
                            }
                          >
                            {skill.skill_type}
                          </span>
                        </div>

                        <p>
                          {skill.description || "No description added."}
                        </p>

                        <div className="skill-meta">
                          <span>{skill.skill_level}</span>

                          {skill.skill_type === "Teach" && (
                            <span>{skill.teaching_mode}</span>
                          )}
                        </div>
                      </div>

                      <button
                        className="delete-btn"
                        onClick={() =>
                          handleDeleteSkill(skill.userSkillId)
                        }
                        title="Delete skill"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            className="back-home dashboard-home"
            onClick={() => setPage("home")}
          >
            ← Back to Home
          </button>
        </section>
      )}
    </div>
  );
}

export default App;
