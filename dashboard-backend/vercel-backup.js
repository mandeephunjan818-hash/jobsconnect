/**
 * Vercel Project Backup Downloader
 * Uses the official Vercel API — no cookies or hacks needed.
 *
 * Usage:
 *   1. Fill in your VERCEL_TOKEN below (from vercel.com/account/tokens)
 *   2. Set your PROJECT_NAME or leave blank to backup ALL projects
 *   3. Run:  node vercel-backup.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ─── CONFIG ────────────────────────────────────────────────────────────────
const VERCEL_TOKEN = ""; // <-- paste your token here
const PROJECT_NAME = "jobs-connect-dashboard";            // your project name
const TEAM_ID = "";                             // leave blank if personal account
const OUTPUT_DIR = ".";                         // saves files in current folder
// ───────────────────────────────────────────────────────────────────────────

const BASE_URL = "api.vercel.com";

function apiRequest(apiPath) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_URL,
            path: TEAM_ID
                ? `${apiPath}${apiPath.includes("?") ? "&" : "?"}teamId=${TEAM_ID}`
                : apiPath,
            method: "GET",
            headers: {
                Authorization: `Bearer ${VERCEL_TOKEN}`,
                "Content-Type": "application/json",
            },
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve(data); }
            });
        });

        req.on("error", reject);
        req.end();
    });
}

// Fetches a single file's content — returns raw buffer (handles base64 or plain)
function fetchFileContent(apiPath) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_URL,
            path: apiPath,
            method: "GET",
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                const redirectUrl = new URL(res.headers.location);
                https.request({
                    hostname: redirectUrl.hostname,
                    path: redirectUrl.pathname + redirectUrl.search,
                    method: "GET",
                }, (redirRes) => collectResponse(redirRes, resolve, reject))
                    .on("error", reject).end();
                return;
            }
            collectResponse(res, resolve, reject);
        });

        req.on("error", reject);
        req.end();
    });
}

function collectResponse(res, resolve, reject) {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
        const raw = Buffer.concat(chunks);

        // Try to parse as JSON — Vercel wraps file content as { data: "<base64>" }
        try {
            const json = JSON.parse(raw.toString("utf8"));
            if (json && typeof json.data === "string") {
                // base64 encoded file content — decode it
                resolve(Buffer.from(json.data, "base64"));
                return;
            }
        } catch (e) {
            // Not JSON — treat as raw binary/text content
        }

        resolve(raw);
    });
    res.on("error", reject);
}

function saveFile(destPath, content) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, content);
}

async function getProjects() {
    console.log("📦 Fetching projects...");
    const data = await apiRequest("/v9/projects?limit=100");
    if (data.error) throw new Error(`API error: ${data.error.message}`);
    return data.projects || [];
}

async function getLatestDeployment(projectId, projectName) {
    console.log(`🔍 Finding latest deployment for: ${projectName}`);
    const data = await apiRequest(
        `/v6/deployments?projectId=${projectId}&limit=1&state=READY&target=production`
    );
    if (data.error) throw new Error(`API error: ${data.error.message}`);
    const deployments = data.deployments || [];
    if (deployments.length === 0) {
        console.log(`  ⚠️  No ready deployments found for ${projectName}`);
        return null;
    }
    return deployments[0];
}

async function getDeploymentFiles(deploymentId) {
    const data = await apiRequest(`/v6/deployments/${deploymentId}/files`);
    if (data.error) throw new Error(`API error: ${data.error.message}`);
    return data;
}

function flattenFiles(files, prefix = "") {
    const result = [];
    for (const file of files) {
        const filePath = prefix ? `${prefix}/${file.name}` : file.name;
        if (file.type === "directory") {
            if (file.children) {
                result.push(...flattenFiles(file.children, filePath));
            }
        } else {
            result.push({ ...file, path: filePath });
        }
    }
    return result;
}

function stripTopFolder(filePath, folderName) {
    // "src/app/page.tsx" -> "app/page.tsx"
    const prefix = folderName + "/";
    return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
}

async function downloadDeploymentFiles(deployment) {
    const deployId = deployment.uid;
    console.log(`\n  📁 Deployment: ${deployment.url} (${deployId})`);

    const filesTree = await getDeploymentFiles(deployId);
    const allFiles = flattenFiles(Array.isArray(filesTree) ? filesTree : [filesTree]);

    // Skip the entire "out" folder
    const files = allFiles.filter((f) => !f.path.startsWith("out/") && f.path !== "out");

    console.log(`  📄 Found ${files.length} files (out/ folder skipped)`);

    let downloaded = 0;
    let failed = 0;

    for (const file of files) {
        // Strip leading "src/" so files land directly in OUTPUT_DIR
        const strippedPath = stripTopFolder(file.path, "src");
        const destPath = path.join(OUTPUT_DIR, strippedPath);

        const apiPath = TEAM_ID
            ? `/v7/deployments/${deployId}/files/${file.uid}?teamId=${TEAM_ID}`
            : `/v7/deployments/${deployId}/files/${file.uid}`;

        try {
            const content = await fetchFileContent(apiPath);
            saveFile(destPath, content);
            downloaded++;
            process.stdout.write(`\r  ✅ ${downloaded}/${files.length} files downloaded`);
        } catch (err) {
            failed++;
            console.error(`\n  ❌ Failed: ${file.path} — ${err.message}`);
        }
    }

    console.log(`\n  🎉 Done! ${downloaded} downloaded, ${failed} failed`);
    console.log(`  📂 Saved to: ${path.resolve(OUTPUT_DIR)}`);
}

async function main() {
    if (VERCEL_TOKEN === "YOUR_VERCEL_TOKEN_HERE") {
        console.error("❌ Please set your VERCEL_TOKEN in the config at the top.");
        process.exit(1);
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    let projects = await getProjects();

    if (PROJECT_NAME) {
        projects = projects.filter((p) => p.name === PROJECT_NAME);
        if (projects.length === 0) {
            console.error(`❌ Project "${PROJECT_NAME}" not found.`);
            process.exit(1);
        }
    }

    console.log(`\n🚀 Backing up ${projects.length} project(s)...\n`);

    for (const project of projects) {
        console.log(`\n━━━ Project: ${project.name} ━━━`);
        const deployment = await getLatestDeployment(project.id, project.name);
        if (!deployment) continue;
        await downloadDeploymentFiles(deployment);
    }

    console.log("\n✅ All done!");
}

main().catch((err) => {
    console.error("\n❌ Fatal error:", err.message);
    process.exit(1);
});