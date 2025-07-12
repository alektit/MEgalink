function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function animateValue(start, end, duration, onUpdate) {
    const startTime = performance.now();
    let frameId;

    function frame(currentTime) {
        const elapsedTime = currentTime - startTime;
        if (elapsedTime >= duration) {
            onUpdate(end);
            cancelAnimationFrame(frameId);
            return;
        }
        const progress = elapsedTime / duration;
        const currentValue = start + (end - start) * progress;
        onUpdate(currentValue);
        frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);
}


async function simulatePing(onUpdate) {
    onUpdate('ping', 0);
    await sleep(500);
    const ping = Math.floor(Math.random() * 25) + 8; // 8-32 ms
    const jitter = Math.floor(Math.random() * 8) + 1; // 1-8 ms
    onUpdate('jitter', 0);
    await sleep(200);
    return { ping, jitter };
}

async function simulateDownload(onUpdate) {
    onUpdate('Download', 0);
    await sleep(500);
    
    const finalSpeed = Math.random() * 800 + 50; // 50-850 Mbps
    
    return new Promise(resolve => {
        animateValue(0, finalSpeed, 3000, (currentSpeed) => {
            onUpdate('Download', currentSpeed);
            if (currentSpeed === finalSpeed) {
                resolve(finalSpeed);
            }
        });
    });
}

async function simulateUpload(onUpdate) {
    onUpdate('Upload', 0);
    await sleep(500);
    
    const finalSpeed = Math.random() * 200 + 20; // 20-220 Mbps
    
    return new Promise(resolve => {
        animateValue(0, finalSpeed, 3000, (currentSpeed) => {
            onUpdate('Upload', currentSpeed);
            if (currentSpeed === finalSpeed) {
                resolve(finalSpeed);
            }
        });
    });
}


export async function startTest(onSpeedUpdate, onPingComplete) {
    const { ping, jitter } = await simulatePing(onSpeedUpdate);
    onPingComplete({ ping, jitter });
    
    const downloadSpeed = await simulateDownload(onSpeedUpdate);
    await sleep(500);

    const uploadSpeed = await simulateUpload(onSpeedUpdate);
    await sleep(500);

    onSpeedUpdate('Mbps', downloadSpeed);

    return {
        download: parseFloat(downloadSpeed.toFixed(2)),
        upload: parseFloat(uploadSpeed.toFixed(2)),
    };
}