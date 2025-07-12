import { startTest } from './speedtest.js';
import { createAudio } from './audio.js';
import { runAdvancedPingTest } from './pingtest.js';

document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('theme-switcher');
    const themeIcon = document.getElementById('theme-icon');
    const startBtn = document.getElementById('start-test-btn');
    
    // Advanced Ping Test elements
    const pingTestBtn = document.getElementById('ping-test-btn');
    const pingModal = document.getElementById('ping-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const startPingBtn = document.getElementById('start-ping-btn');
    const pingResultsContainer = document.getElementById('ping-results-container');
    
    const speedValueEl = document.getElementById('speed-value');
    const speedUnitEl = document.getElementById('speed-unit');
    
    const pingResultEl = document.getElementById('ping-result');
    const jitterResultEl = document.getElementById('jitter-result');
    const downloadResultEl = document.getElementById('download-result');
    const uploadResultEl = document.getElementById('upload-result');
    
    const ipAddressEl = document.getElementById('ip-address');
    const connectionTypeEl = document.getElementById('connection-type');

    let testCompleteSound, testInProgressSound;
    let testInProgressSource;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    async function initAudio() {
        try {
            if (!testCompleteSound) {
                testCompleteSound = await createAudio('test-complete.mp3', audioContext);
            }
            if (!testInProgressSound) {
                testInProgressSound = await createAudio('test-in-progress.mp3', audioContext);
            }
        } catch (error) {
            console.error("Failed to initialize audio:", error);
        }
    }
    
    // Theme switching
    const setInitialTheme = () => {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.body.classList.replace('light-theme', 'dark-theme');
            themeIcon.src = 'sun.png';
        } else {
            document.body.classList.replace('dark-theme', 'light-theme');
            themeIcon.src = 'moon.png';
        }
    };

    themeSwitcher.addEventListener('click', () => {
        if(audioContext.state === 'suspended') {
            audioContext.resume();
        }
        initAudio(); // Initialize audio on first user interaction
        document.body.classList.toggle('dark-theme');
        document.body.classList.toggle('light-theme');

        if (document.body.classList.contains('dark-theme')) {
            themeIcon.src = 'sun.png';
        } else {
            themeIcon.src = 'moon.png';
        }
        // Re-render gauge to pick up new colors
        setupGauge();
    });

    // --- Advanced Ping Test Logic ---

    pingTestBtn.addEventListener('click', () => {
        pingModal.style.display = 'flex';
        preparePingUI();
    });

    closeModalBtn.addEventListener('click', () => {
        pingModal.style.display = 'none';
    });

    // Close modal if clicking on the overlay
    pingModal.addEventListener('click', (event) => {
        if (event.target === pingModal) {
            pingModal.style.display = 'none';
        }
    });

    const preparePingUI = () => {
        pingResultsContainer.innerHTML = ''; // Clear previous results
        const servers = [
            { name: 'Google DNS', address: '8.8.8.8' },
            { name: 'Cloudflare DNS', address: '1.1.1.1' }
        ];

        servers.forEach(server => {
            const resultEl = document.createElement('div');
            resultEl.className = 'ping-result-item';
            resultEl.id = `ping-result-${server.address}`;
            resultEl.innerHTML = `
                <span class="ping-server-name">${server.name}</span>
                <span class="ping-server-address">${server.address}</span>
                <div class="ping-stats">- ms</div>
            `;
            pingResultsContainer.appendChild(resultEl);
        });
        startPingBtn.disabled = false;
        startPingBtn.textContent = 'Start Ping Test';
    };
    
    const getPingClassification = (ping) => {
        if (ping < 50) return { text: 'Excellent', className: 'excellent' };
        if (ping <= 100) return { text: 'Good', className: 'good' };
        if (ping <= 200) return { text: 'Fair', className: 'fair' };
        return { text: 'Bad', className: 'bad' };
    };

    const updatePingUI = (server, data) => {
        const resultEl = document.getElementById(`ping-result-${server.address}`);
        const statsEl = resultEl.querySelector('.ping-stats');
        
        // Reset classes
        statsEl.className = 'ping-stats';

        if (data.status === 'testing') {
            statsEl.textContent = 'Pinging...';
            statsEl.classList.add('testing');
        } else if (data.status === 'complete') {
            if (data.avg > 0) {
                 const classification = getPingClassification(data.avg);
                 statsEl.classList.add(classification.className);
                 statsEl.innerHTML = `
                    ${data.avg.toFixed(0)} ms
                    <div class="ping-details">${classification.text} &bull; Jitter: ${data.jitter.toFixed(1)}ms &bull; Loss: ${(data.packetLoss * 100)}%</div>
                `;
            } else {
                 statsEl.classList.add('bad');
                 statsEl.innerHTML = `
                    Failed
                    <div class="ping-details">100% packet loss</div>
                `;
            }
        }
    };

    startPingBtn.addEventListener('click', async () => {
        if(audioContext.state === 'suspended') {
            audioContext.resume();
        }
        await initAudio(); // Ensure audio is ready

        startPingBtn.disabled = true;
        startPingBtn.textContent = 'Testing...';
        
        // Use a test-in-progress sound if available
        if (testInProgressSound) {
            testInProgressSource = audioContext.createBufferSource();
            testInProgressSource.buffer = testInProgressSound;
            testInProgressSource.loop = true;
            testInProgressSource.connect(audioContext.destination);
            testInProgressSource.start(0);
        }
        
        await runAdvancedPingTest(updatePingUI);

        if (testInProgressSource) {
            testInProgressSource.stop();
        }
        
        // Play completion sound
        if(testCompleteSound) {
            const source = audioContext.createBufferSource();
            source.buffer = testCompleteSound;
            source.connect(audioContext.destination);
            source.start(0);
        }

        startPingBtn.disabled = false;
        startPingBtn.textContent = 'Test Again';
    });

    // --- Gauge and Speed Test Logic ---

    // Gauge setup
    let gauge;
    const gaugeOptions = {
        angle: -0.2,
        lineWidth: 0.15,
        radiusScale: 1,
        pointer: {
            length: 0.5,
            strokeWidth: 0.035,
            color: '#000000'
        },
        limitMax: false,
        limitMin: false,
        strokeColor: '#E0E0E0',
        generateGradient: true,
        highDpiSupport: true,
        staticLabels: {
            font: "10px sans-serif",
            labels: [0, 50, 100, 250, 500, 1000],
            color: "#000000",
            fractionDigits: 0
        },
        staticZones: [
           {strokeStyle: "#F03E3E", min: 0, max: 100},
           {strokeStyle: "#FFDD00", min: 100, max: 500},
           {strokeStyle: "#30B32D", min: 500, max: 1000}
        ]
    };

    function setupGauge() {
        const isDark = document.body.classList.contains('dark-theme');
        gaugeOptions.pointer.color = isDark ? '#FFFFFF' : '#1c1c1e';
        gaugeOptions.staticLabels.color = isDark ? '#a0a0a5' : '#6a6a6e';
        gaugeOptions.strokeColor = isDark ? '#38383a' : '#e0e0e0';

        const gaugeEl = document.getElementById('speed-gauge');
        gauge = new Gauge(gaugeEl).setOptions(gaugeOptions);
        gauge.maxValue = 1000;
        gauge.setMinValue(0);
        gauge.animationSpeed = 32;
        gauge.set(0);
    }
    
    const resetUI = () => {
        speedValueEl.textContent = '0.00';
        speedUnitEl.textContent = 'Mbps';
        pingResultEl.textContent = '- ms';
        jitterResultEl.textContent = '- ms';
        downloadResultEl.textContent = '- Mbps';
        uploadResultEl.textContent = '- Mbps';
        gauge.set(0);
    };

    const updateUICallback = (phase, speed) => {
        if (phase === 'ping' || phase === 'jitter') {
             speedUnitEl.textContent = 'Testing...';
        } else {
            speedUnitEl.textContent = phase;
        }
       
        if(speed !== null) {
            gauge.set(speed);
            speedValueEl.textContent = speed.toFixed(2);
        }
    };
    
    const onPingComplete = ({ping, jitter}) => {
        pingResultEl.textContent = `${ping} ms`;
        jitterResultEl.textContent = `${jitter} ms`;
    };

    startBtn.addEventListener('click', async () => {
        if(audioContext.state === 'suspended') {
            audioContext.resume();
        }
        await initAudio();

        startBtn.disabled = true;
        startBtn.textContent = 'Testing...';
        resetUI();

        if (testInProgressSound) {
            testInProgressSource = audioContext.createBufferSource();
            testInProgressSource.buffer = testInProgressSound;
            testInProgressSource.loop = true;
            testInProgressSource.connect(audioContext.destination);
            testInProgressSource.start(0);
        }

        const results = await startTest(updateUICallback, onPingComplete);
        
        if (testInProgressSource) {
            testInProgressSource.stop();
        }

        downloadResultEl.textContent = `${results.download} Mbps`;
        uploadResultEl.textContent = `${results.upload} Mbps`;

        speedValueEl.textContent = results.download.toFixed(2);
        speedUnitEl.textContent = 'Mbps';
        gauge.set(results.download);
        
        startBtn.disabled = false;
        startBtn.textContent = 'Start Again';

        if(testCompleteSound) {
            const source = audioContext.createBufferSource();
            source.buffer = testCompleteSound;
            source.connect(audioContext.destination);
            source.start(0);
        }
    });

    // Initial setup
    const fetchNetworkInfo = async () => {
        try {
            // This is a free, public API. Use with caution in production.
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            ipAddressEl.textContent = data.ip || 'Unavailable';
        } catch (error) {
            console.error('Could not fetch IP address:', error);
            ipAddressEl.textContent = 'Unavailable';
        }

        if (navigator.connection) {
            const type = navigator.connection.effectiveType;
            if (type.includes('4g')) connectionTypeEl.textContent = 'Cellular (4G)';
            else if (type.includes('5g')) connectionTypeEl.textContent = 'Cellular (5G)'; // Future-proof
            else if (type.includes('3g')) connectionTypeEl.textContent = 'Cellular (3G)';
            else connectionTypeEl.textContent = 'Wi-Fi / Ethernet';
        }
    };
    
    setInitialTheme();
    setupGauge();
    fetchNetworkInfo();

});