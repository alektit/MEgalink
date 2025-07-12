/**
 * A helper function to measure the latency of a single fetch request.
 * It uses a cache-busting query parameter to avoid cached results.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<number>} - The latency in milliseconds.
 */
async function measureLatency(url) {
    const startTime = performance.now();
    try {
        const response = await fetch(`${url}?t=${Date.now()}`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (e) {
        // We treat network errors as a failed ping (timeout)
        console.warn(`Request to ${url} failed:`, e.message);
        return -1; // Indicate a failed ping
    }
    return performance.now() - startTime;
}


/**
 * Runs a series of ping tests to a specific server endpoint.
 * @param {string} url - The URL of the server to ping.
 * @param {number} count - The number of pings to send.
 * @param {function} onProgress - Callback for each successful ping, receives latency.
 * @returns {Promise<{times: number[], packetLoss: number, jitter: number, avg: number}>}
 */
async function pingServer(url, count, onProgress) {
    const times = [];
    let failedPings = 0;

    for (let i = 0; i < count; i++) {
        const latency = await measureLatency(url);
        if (latency === -1) {
            failedPings++;
        } else {
            times.push(latency);
            if (onProgress) onProgress(latency);
        }
        // Small delay between pings to not overwhelm the network/server
        if (i < count - 1) await new Promise(res => setTimeout(res, 250));
    }
    
    if (times.length === 0) {
        return { times: [], packetLoss: 1, jitter: 0, avg: 0 };
    }

    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;

    let jitterSum = 0;
    for (let i = 1; i < times.length; i++) {
        jitterSum += Math.abs(times[i] - times[i-1]);
    }
    const jitter = times.length > 1 ? jitterSum / (times.length - 1) : 0;

    const packetLoss = failedPings / count;

    return { times, packetLoss, jitter, avg };
}


const servers = [
    { name: 'Google DNS', address: '8.8.8.8', url: 'https://dns.google/resolve?name=example.com' },
    { name: 'Cloudflare DNS', address: '1.1.1.1', url: 'https://cloudflare-dns.com/dns-query?name=example.com&type=A' }
];

/**
 * Runs the advanced ping test against a predefined list of servers.
 * @param {function} onUpdate - Callback to update the UI with results for each server.
 */
export async function runAdvancedPingTest(onUpdate) {
    const PING_COUNT = 4;
    for (const server of servers) {
        onUpdate(server, { status: 'testing' });
        const results = await pingServer(server.url, PING_COUNT, null);
        onUpdate(server, {
            status: 'complete',
            avg: results.avg,
            jitter: results.jitter,
            packetLoss: results.packetLoss
        });
    }
}