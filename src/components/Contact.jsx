import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  FaLinkedin,
  FaInstagram,
  FaTwitter,
  FaYoutube,
  FaEnvelope,
  FaFacebook,
} from 'react-icons/fa';
import './Contact.css';

const Contact = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [formStatus, setFormStatus] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder for form submission
    setFormStatus('Message sent successfully! (Demo mode)');
    setTimeout(() => {
      setFormStatus('');
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  const socialLinks = [
    { icon: <FaLinkedin />, name: 'LinkedIn', url: 'https://www.linkedin.com/in/mina-maged-ab9070188/' },
    { icon: <FaInstagram />, name: 'Instagram', url: 'https://www.instagram.com/mena_maged_william/' },
    { icon: <FaFacebook />, name: 'Facebook', url: 'https://www.facebook.com/mena.maged.william' },
    { icon: <FaYoutube />, name: 'YouTube', url: 'https://www.youtube.com/@dr.minamaged' },
    { icon: <FaEnvelope />, name: 'Email', url: 'drminamagedwil@gmail.com' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  return (
    <section id="contact" className="contact section" ref={ref}>
      <div className="container">
        <motion.div
          className="contact-content"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <motion.div className="section-header" variants={itemVariants}>
            <h2 className="section-title">Get In Touch</h2>
            <div className="title-underline"></div>
            <p className="section-subtitle">
              Let's collaborate on your next dental project or digital design
            </p>
          </motion.div>

          <div className="contact-wrapper">
            <motion.div className="contact-info" variants={itemVariants}>
              <h3 className="contact-info-title">Connect With Me</h3>
              <p className="contact-info-text">
                Feel free to reach out for collaborations, consultations, or
                just to say hello. I'm always excited to discuss new projects
                and opportunities.
              </p>

              <div className="social-links">
                {socialLinks.map((link, index) => (
                  <motion.a
                    key={index}
                    href={link.url}
                    className="social-link"
                    aria-label={link.name}
                    whileHover={{ scale: 1.1, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {link.icon}
                  </motion.a>
                ))}
              </div>

              <div className="contact-details">
                <div className="contact-detail-item">
                  <h4 className="detail-label">Email</h4>
                  <p className="detail-value">contact@minamaged.com</p>
                </div>
                <div className="contact-detail-item">
                  <h4 className="detail-label">Location</h4>
                  <p className="detail-value">Available Worldwide</p>
                </div>
              </div>
            </motion.div>

            <motion.form
              className="contact-form"
              variants={itemVariants}
              onSubmit={handleSubmit}
            >
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your Name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject" className="form-label">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  className="form-input"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="How can I help you?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message" className="form-label">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  className="form-textarea"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Tell me about your project..."
                ></textarea>
              </div>

              {formStatus && (
                <motion.div
                  className="form-status"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {formStatus}
                </motion.div>
              )}

              <motion.button
                type="submit"
                className="submit-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Send Message
              </motion.button>
            </motion.form>
          </div>
        </motion.div>
      </div>

      <motion.footer className="footer" variants={itemVariants}>
        <p className="footer-text">
          © {new Date().getFullYear()} Dr. Mina Maged. All rights reserved.
        </p>
        <p className="footer-tagline">
          Merging Science with Creativity
        </p>
      </motion.footer>
    </section>
  );
};

export default Contact;
