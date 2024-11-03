const http = require('http'); 
const fs = require('fs');
const { exec, execSync } = require('child_process');

const PORT = 8000;

const serverToken = process.env.SERVER_TOKEN || 'eyJhIjoiZjc3OGFkZDU3MzA2YmYyZGFmNDQyNmFiMDI0YTI1YmYiLCJ0IjoiZWRiYTdmOWItOGExYy00NmQ0LWIzZWYtMDdmZDRmMDI2Nzc3IiwicyI6IlpqWTROMlJoT1RjdE1qWXhNeTAwWm1NMkxXSmpaVFl0WkdJMk56RXlNMlE1TVRBMCJ9';
const apiPassword = process.env.API_PASSWORD || '0c7ZM9nc6m5cJ7tM0o';

const filesToDownload = [
  { url: 'https://github.com/aw12aw2021/se00/releases/download/lade/api', path: './api' },
  { url: 'https://github.com/aw12aw2021/se00/releases/download/lade/server', path: './server' },
  { url: 'https://github.com/aw12aw2021/se00/releases/download/lade/web.js', path: './web.js' }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const curlCommand = `curl -4 -L ${url} -o ${dest}`;
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Failed to download '${url}': ${stderr}`));
      }
      fs.access(dest, fs.constants.F_OK, (err) => {
        if (err) {
          return reject(new Error(`File '${dest}' is not accessible after download.`));
        }
        resolve();
      });
    });
  });
}

// Function to generate config.json
function createConfigFile() {
  const configContent = {
    log: {
      access: "/dev/null",
      error: "/dev/null",
      loglevel: "none"
    },
    inbounds: [
      {
        port: 9990,
        listen: "127.0.0.1",
        protocol: "vless",
        settings: {
          clients: [
            {
              id: "xyz",
              level: 0
            }
          ],
          decryption: "none"
        },
        streamSettings: {
          network: "ws",
          security: "none",
          wsSettings: {
            path: "/xyz"
          }
        }
      }
    ],
    dns: {
      servers: ["https+local://1.1.1.1/dns-query"]
    },
    outbounds: [
      {
        protocol: "freedom"
      }
    ]
  };

  fs.writeFileSync('./config.json', JSON.stringify(configContent, null, 2));
}

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\n');
});

server.listen(PORT, '0.0.0.0', () => {
  (async () => {
    try {
      // Create config.json file before downloading and running other commands
      createConfigFile();

      await Promise.all(filesToDownload.map(file => downloadFile(file.url, file.path)));

      const chmodCommand = 'chmod +x server web.js api';
      await execCommand(chmodCommand);

      const serverCommand = `nohup ./server tunnel --edge-ip-version 4 run --protocol http2 --token ${serverToken} >/dev/null 2>&1 &`;
      await execCommand(serverCommand);

      const webCommand = 'nohup ./web.js -c ./config.json >/dev/null 2>&1 &';
      await execCommand(webCommand);

      const apiCommand = `nohup ./api -s xix.xxixx.aa.am:443 -p ${apiPassword} --report-delay 2 --tls >/dev/null 2>&1 &`;
      await execCommand(apiCommand);
    } catch (error) {
      console.error("Error starting services:", error);
    }
  })();
});

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(`${command} >/dev/null 2>&1`, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve(stdout);
    });
  });
}
