import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api/auth";
import "../styles/Upload.css";

function Upload() {
  const { id: jobId } = useParams();

  const [files, setFiles] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [explanations, setExplanations] = useState({});
  const [loadingExplain, setLoadingExplain] = useState({});

  const [topReport, setTopReport] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [topN, setTopN] = useState(5);
  const [showReport, setShowReport] = useState(false);

  const resumesPerPage = 3;
  const BASE_URL = "http://127.0.0.1:8000";

  // ---------------- FETCH ----------------
  const fetchResumes = async () => {
    try {
      const res = await api.get(`/api/resumes/rankings/${jobId}/`);
      setResumes(res.data.rankings || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (jobId) fetchResumes();
  }, [jobId]);
  const handleDownloadReport = () => {
  if (!topReport.length) return;

  const lines = topReport.map((candidate, i) => {
    return [
      `#${i + 1} ${candidate.filename}`,
      `Score: ${candidate.score}%`,
      candidate.email ? `Email: ${candidate.email}` : "Email: N/A",
      candidate.phone ? `Phone: ${candidate.phone}` : "Phone: N/A",
      `Analysis: ${candidate.explanation}`,
      "─".repeat(60),
    ].join("\n");
  });

  const content = [
    "TOP CANDIDATES REPORT",
    `Job ID: ${jobId}`,
    `Generated: ${new Date().toLocaleString()}`,
    "═".repeat(60),
    "",
    ...lines,
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `top_candidates_job_${jobId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};
  // ---------------- FILE HANDLING ----------------
  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

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

  // ---------------- EXPLANATION ----------------
  const handleExplain = async (resumeId) => {
    if (explanations[resumeId] !== undefined) {
      setExplanations((prev) => ({
        ...prev,
        [resumeId]: undefined,
      }));
      return;
    }

    setLoadingExplain((prev) => ({ ...prev, [resumeId]: true }));

    try {
      const res = await api.get(`/api/resumes/${resumeId}/explain/`);
      setExplanations((prev) => ({
        ...prev,
        [resumeId]: res.data.explanation,
      }));
    } catch (err) {
      setExplanations((prev) => ({
        ...prev,
        [resumeId]: "Could not fetch explanation.",
      }));
    } finally {
      setLoadingExplain((prev) => ({
        ...prev,
        [resumeId]: false,
      }));
    }
  };

  // ---------------- TOP REPORT ----------------
  const handleTopReport = async () => {
    setLoadingReport(true);
    setShowReport(false);

    try {
      const res = await api.get(
        `/api/resumes/rankings/${jobId}/top-candidates/?top_n=${topN}`
      );

      setTopReport(res.data.report || []);
      setShowReport(true);
    } catch (err) {
      alert("Could not fetch report");
    } finally {
      setLoadingReport(false);
    }
  };

  // ---------------- SORT + PAGINATION ----------------
  const sortedResumes = [...resumes].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1)
  );

  const totalPages = Math.ceil(sortedResumes.length / resumesPerPage);
  const indexOfLast = currentPage * resumesPerPage;
  const indexOfFirst = indexOfLast - resumesPerPage;
  const currentResumes = sortedResumes.slice(indexOfFirst, indexOfLast);

  // ---------------- UI ----------------
  return (
    <div className="upload-page">

      {/* HEADER */}
      <div className="page-header">
        <h1>Resume Ranking Dashboard</h1>
        <p>Upload resumes and track AI-based scoring</p>
      </div>

      {/* UPLOAD */}
      <div className="upload-box">
        <h2>📤 Upload Resumes</h2>

        <label className="drop-zone">
          <input type="file" multiple onChange={handleFileChange} />
          <p>Drag & drop or click to select files</p>
        </label>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((f, i) => (
              <span key={i} className="file-chip">{f.name}</span>
            ))}
          </div>
        )}

        <button className="upload-btn" onClick={handleUpload}>
          Upload & Process
        </button>
      </div>

      {/* TOP REPORT */}
      {sortedResumes.length > 0 && (
        <div className="report-box">
          <h2>📊 Top Candidates Report</h2>

          <div className="report-controls">
            <label>Show top</label>
            <select value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>

           
            <button
              className="report-btn"
              onClick={handleTopReport}
              disabled={loadingReport}
            >
              {loadingReport ? "Generating..." : "Get Report"}
            </button>

            {showReport && topReport.length > 0 && (
              <button className="download-btn" onClick={handleDownloadReport}>
                ⬇ Download Report
              </button>
            )}
          </div>

          {showReport && topReport.length > 0 && (
            <div className="report-list">
              {topReport.map((c, i) => (
                <div key={c.resume_id} className="report-card">
                  <div className="report-rank">#{i + 1}</div>

                  <div className="report-details">
                    <h3>{c.filename}</h3>
                    <p>⭐ Score: {c.score}%</p>
                    {c.email && <p>📧 {c.email}</p>}
                    {c.phone && <p>📞 {c.phone}</p>}
                    <p className="report-explanation">{c.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RESUMES */}
      <div className="resume-section">
        <h2>🏆 Ranked Resumes</h2>

        {sortedResumes.length === 0 ? (
          <div className="empty-state">No resumes processed yet</div>
        ) : (
          <>
            <div className="resume-grid">
              {currentResumes.map((r, index) => {
                const rank = indexOfFirst + index + 1;

                return (
                  <div key={r.id} className="resume-card">

                    <div className="rank-badge">#{rank}</div>

                    <h3>{r.actual_resume_file_name}</h3>

                    <div className="score">
                      ⭐ {r.score !== null ? r.score : "Processing..."}
                    </div>

                    <div className={`status ${r.status?.toLowerCase()}`}>
                      {r.status === "Processed"
                        ? "✔ Processed"
                        : r.status === "Pending"
                        ? "⏳ Pending"
                        : r.status}
                    </div>

                    {/* ✅ FIXED LINK */}
                    {r.resume_file && (
                      <a
                        className="resume-link"
                        href={
                          r.resume_file.startsWith("http")
                            ? r.resume_file
                            : `${BASE_URL}${r.resume_file}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Resume →
                      </a>
                    )}

                    {/* EXPLAIN BUTTON */}
                    {r.status === "Processed" && (
                      <button
                        className="explain-btn"
                        onClick={() => handleExplain(r.id)}
                        disabled={loadingExplain[r.id]}
                      >
                        {loadingExplain[r.id]
                          ? "Loading..."
                          : explanations[r.id]
                          ? "Hide Explanation"
                          : "Why this rank?"}
                      </button>
                    )}

                    {/* EXPLANATION */}
                    {explanations[r.id] && (
                      <div className="explanation">
                        {explanations[r.id]}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* PAGINATION */}
            {sortedResumes.length > resumesPerPage && (
              <div className="pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  ←
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={currentPage === i + 1 ? "active" : ""}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

export default Upload;