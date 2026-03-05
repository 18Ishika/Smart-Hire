import React from 'react'

const Feature = () => {
return (
    <section className="feature-section">

      <div className="feature-card">
        <img
          src="https://images.unsplash.com/photo-1507679799987-c73779587ccf"
          alt="feature"
        />
        <div className="feature-text">
          <h2>Create Job Description</h2>
          <p>
            Recruiters can easily create job descriptions
            with required skills and experience.
          </p>
        </div>
      </div>

      <div className="feature-card">
        <img
          src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800"
          alt="feature"
        />
        <div className="feature-text">
          <h2>Upload Multiple Resumes</h2>
          <p>
            Upload hundreds of resumes and let the system
            analyze them automatically.
          </p>
        </div>
      </div>

      <div className="feature-card">
        <img
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71"
          alt="feature"
        />
        <div className="feature-text">
          <h2>Get Top Candidates</h2>
          <p>
            AI ranks candidates based on their
            similarity with the job description.
          </p>
        </div>
      </div>

    </section>
  );
}

export default Feature
