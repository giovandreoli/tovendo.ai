let ws;
let corAlvo = null;

async function entrar() {
    const nome = document.getElementById("nome").value;
    const sala = document.getElementById("sala").value;

    ws = new WebSocket(`wss://${location.host}/ws/${sala}/${nome}`);

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "cor") {
            corAlvo = msg.cor;
            document.getElementById("corRodada").innerText = "Procurando: " + corAlvo.toUpperCase();
        }

        if (msg.type === "ponto") {
            atualizarPontos(msg.pontos);
        }

        if (msg.type === "vencedor") {
            alert("🏆 Vencedor: " + msg.nome);
        }
    };

    document.getElementById("menu").style.display = "none";
    document.getElementById("jogo").style.display = "block";

    iniciarCamera();
    iniciarDeteccao();
}

function atualizarPontos(pontos) {
    let html = "";
    for (let j in pontos) html += `${j}: ${pontos[j]}<br>`;
    document.getElementById("pontos").innerHTML = html;
}

async function iniciarCamera() {
    const video = document.getElementById("video");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
}

function iniciarDeteccao() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    setInterval(() => {
        if (!corAlvo) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        let detectado = false;

        for (let i = 0; i < frame.length; i += 4) {
            const r = frame[i];
            const g = frame[i + 1];
            const b = frame[i + 2];

            if (corAlvo === "vermelho" && r > 180 && g < 80 && b < 80) detectado = true;
            if (corAlvo === "verde"   && g > 180 && r < 80 && b < 80) detectado = true;
            if (corAlvo === "azul"    && b > 180 && r < 80 && g < 80) detectado = true;

            if (detectado) break;
        }

        if (detectado) {
            ws.send(JSON.stringify({ type: "achei" }));
            corAlvo = null;
            document.getElementById("corRodada").innerText = "Aguardando próxima rodada...";
        }

    }, 200);
}
