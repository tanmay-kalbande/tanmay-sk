import { motion } from "framer-motion";
import "../styles/maintenance.css";

const MaintenancePage = () => {
  return (
    <div className="m-shell">
      <div className="m-scanline" />
      
      <div className="m-data-stream">
        SYSTEM-CORE_v5.0.2<br />
        STATUS: RECALIBRATING<br />
        UPLINK: SHADOW_LINK<br />
        AUTH_TOKEN: 0x8F2A...
      </div>

      <div className="m-container">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="m-header"
        >
          // ACCESS RESTRICTED //
        </motion.div>

        <div className="m-glitch-wrap">
          <h1 className="m-title" data-text="SYSTEM OFFLINE">
            SYSTEM OFFLINE
          </h1>
        </div>

        <div className="m-status">
          <div className="m-progress-box">
            <div className="m-progress-label">
              <span>RECALIBRATING NEURAL ASSETS</span>
              <span>IN_PROGRESS</span>
            </div>
            <div className="m-progress-bar">
              <div className="m-progress-fill" />
            </div>
          </div>

          <p className="m-msg">
            Our systems are currently undergoing a <em>deep recalibration</em> to provide a more refined experience. 
            Estimated restoration within a few days.
          </p>
        </div>
      </div>

      <div className="m-footer">
        <span>© {new Date().getFullYear()} TANMAY S.</span>
        <span>LAT: 28.6139° N // LON: 77.2090° E</span>
        <span>CONNECTED: PROTOTYPE-CORE</span>
      </div>
    </div>
  );
};

export default MaintenancePage;
