import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api/auth";
import "../styles/Upload.css";

function Upload() {
  const { id: jobId } = useParams();

  const [files, setFiles] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobTitle, setJobTitle] = useState("");
  const [explanations, setExplanations] = useState({});
  const [loadingExplain, setLoadingExplain] = useState({});
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const resumesPerPage = 4;
  const BASE_URL = "http://127.0.0.1:8000";

  const fetchResumes = async () => {
    try {
      const res = await api.get(`/api/resumes/rankings/${jobId}/`);
      setResumes(res.data.rankings || []);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchJobDetails = async () => {
    try {
      const res = await api.get(`/api/jobs/${jobId}/`);
      setJobTitle(res.data.title || "Untitled Job");
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchResumes();
      fetchJobDetails();
    }
  }, [jobId]);

  const handleFileChange = (e) => setFiles(Array.from(e.target.files));

  const handleUpload = async () => {
    if (!files.length) return alert("Please select files");
    const formData = new FormData();
    formData.append("job", jobId);
    files.forEach((file) => formData.append("resume_file", file));
    try {
      await api.post("/api/resumes/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFiles([]);
      setCurrentPage(1);
      fetchResumes();
    } catch (err) {
      alert("Upload failed");
    }
  };

  const handleExplain = async (resumeId) => {
    if (explanations[resumeId] !== undefined) {
      setExplanations((prev) => ({ ...prev, [resumeId]: undefined }));
      return;
    }
    setLoadingExplain((prev) => ({ ...prev, [resumeId]: true }));
    try {
      const res = await api.get(`/api/resumes/${resumeId}/explain/`);
      setExplanations((prev) => ({ ...prev, [resumeId]: res.data.explanation }));
    } catch (err) {
      setExplanations((prev) => ({ ...prev, [resumeId]: "Could not fetch explanation." }));
    } finally {
      setLoadingExplain((prev) => ({ ...prev, [resumeId]: false }));
    }
  };

  const sortedResumes = [...resumes].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const totalPages = Math.ceil(sortedResumes.length / resumesPerPage);
  const indexOfLast = currentPage * resumesPerPage;
  const indexOfFirst = indexOfLast - resumesPerPage;
  const currentResumes = sortedResumes.slice(indexOfFirst, indexOfLast);
  const topResume = sortedResumes[0];

  return (
    <div className="upload-page">

      {/* HEADER */}
      <div className="page-header">
        <h1>Resume Ranking Dashboard</h1>
        <p>
          Job: <strong>{jobTitle || "Loading..."}</strong>
          <span style={{ marginLeft: "10px", opacity: 0.6, fontSize: "13px" }}>
            ID: {jobId}
          </span>
        </p>
      </div>

      {/* SPLIT LAYOUT */}
      <div className="main-layout">

        {/* LEFT: UPLOAD SIDEBAR */}
        <div className="upload-box">
          <p className="section-label">Upload files</p>

          <label className="drop-zone">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <div className="drop-zone-icon">
              {/* upload icon */}
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                stroke="#2c7a7b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p>Drag &amp; drop or click to select</p>
            <span>PDF, DOCX supported · max 10MB</span>
          </label>

          {files.length > 0 && (
            <div className="file-list" style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {files.map((f, i) => (
                <span key={i} className="file-chip"
                  style={{
                    fontSize: "12px", padding: "5px 10px",
                    background: "#e8f6f7", color: "#1f6a6b",
                    borderRadius: "8px", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap"
                  }}>
                  {f.name}
                </span>
              ))}
            </div>
          )}

          <button className="upload-btn" onClick={handleUpload}>
            Upload &amp; Process
          </button>
        </div>

        {/* RIGHT: RESULTS */}
        <div className="report-box">

          {sortedResumes.length === 0 ? (
            <div className="empty-state"
              style={{
                textAlign: "center", padding: "60px 20px",
                color: "#7ba8aa", fontSize: "14px",
                background: "#fff", borderRadius: "14px",
                border: "0.5px solid #d4e8e9"
              }}>
              No resumes processed yet — upload some to get started.
            </div>
          ) : (
            <>
              {/* TOP RESUME HERO */}
              {topResume && (
                <div className="top-resume">
                  <div className="top-resume-badge">1</div>
                  <div>
                    <h2>{topResume.actual_resume_file_name}</h2>
                    <p>
                      Top match
                      {topResume.score !== null && ` · ${topResume.score}% compatibility`}
                      {` · ${topResume.status}`}
                    </p>
                  </div>
                </div>
              )}

              {/* REPORT LIST — top 4 always visible */}
              <p className="section-label">All candidates</p>
              <div className="report-list">
                {sortedResumes.slice(0, 4).map((r, index) => (
                  <div key={r.id} className="report-card">
                    <div className="report-rank">{index + 1}</div>

                    <div className="report-details" style={{ flex: 1, minWidth: 0 }}>
                      <h3>{r.actual_resume_file_name}</h3>
                      <p>{r.status}</p>
                      <div className="score-bar">
                        <div
                          className="score-fill"
                          style={{ width: r.score !== null ? `${r.score}%` : "0%" }}
                        />
                      </div>
                      {explanations[r.id] && (
                        <p className="report-explanation">{explanations[r.id]}</p>
                      )}
                    </div>

                    <span className="report-score-label"
                      style={{ fontSize: "13px", fontWeight: 600, color: "#2c7a7b", whiteSpace: "nowrap" }}>
                      {r.score !== null ? `${r.score}%` : "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* RESUME GRID — paginated */}
              <div className="resume-grid">
                {currentResumes.map((r, index) => {
                  const rank = indexOfFirst + index + 1;
                  const fileUrl = `${BASE_URL}/api/resumes/view-resume/${r.id}/`;

                  return (
                    <div key={r.id} className="resume-card">
                      <span className="rank-badge">#{rank} · {r.score !== null ? `${r.score}%` : "—"}</span>

                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a3a3c", margin: "10px 0 2px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.actual_resume_file_name}
                      </p>

                      <p style={{ fontSize: "12px", color: "#7ba8aa", marginBottom: "10px" }}>
                        {r.status === "Processed" ? "✔ Processed"
                          : r.status === "Pending" ? "⏳ Pending"
                          : r.status}
                      </p>

                      <button
                        className="explain-btn"
                        onClick={() => { setSelectedPdf(fileUrl); setPdfLoading(true); }}
                      >
                        View resume →
                      </button>

                      {r.status === "Processed" && (
                        <button
                          className="explain-btn"
                          onClick={() => handleExplain(r.id)}
                          disabled={loadingExplain[r.id]}
                          style={{ marginTop: "6px" }}
                        >
                          {loadingExplain[r.id]
                            ? "Loading..."
                            : explanations[r.id]
                            ? "Hide explanation"
                            : "Why this rank?"}
                        </button>
                      )}

                      {explanations[r.id] && (
                        <p style={{ marginTop: "10px", fontSize: "12px", color: "#5a8688", lineHeight: 1.5 }}>
                          {explanations[r.id]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION */}
              {sortedResumes.length > resumesPerPage && (
                <div className="pagination">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</button>

                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={currentPage === i + 1 ? "active" : ""}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>→</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* PDF MODAL */}
      {selectedPdf && (
        <div className="pdf-modal"
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px"
          }}>
          <div className="pdf-container"
            style={{
              background: "#fff", borderRadius: "18px",
              width: "100%", maxWidth: "860px", height: "90vh",
              display: "flex", flexDirection: "column",
              padding: "20px", gap: "12px"
            }}>

            <div style={{ display: "flex", gap: "10px" }}>
              <button className="upload-btn"
                style={{ width: "auto", padding: "10px 20px", marginTop: 0 }}
                onClick={() => setSelectedPdf(null)}>
                Close
              </button>
              <button className="explain-btn"
                style={{ marginTop: 0, padding: "10px 20px" }}
                onClick={() => window.open(selectedPdf, "_blank")}>
                Open in new tab
              </button>
            </div>

            {pdfLoading && (
              <p style={{ fontSize: "13px", color: "#7ba8aa" }}>Loading PDF...</p>
            )}

            <iframe
              src={`${selectedPdf}#toolbar=1`}
              title="Resume Viewer"
              onLoad={() => setPdfLoading(false)}
              style={{ flex: 1, border: "none", borderRadius: "10px" }}
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default Upload;