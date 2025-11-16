let ws;
let corAlvo = null;
let videoStream = null;

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

    await iniciarCamera();
    iniciarDeteccao();
}

function atualizarPontos(pontos) {
    let html = "";
    for (let j in pontos) html += `${j}: ${pontos[j]}<br>`;
    document.getElementById("pontos").innerHTML = html;
}

async function iniciarCamera() {
    const video = document.getElementById("video");
    if (!videoStream) {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = videoStream;
        await video.play();
    }
}

function corDetectada(r, g, b, corAlvo) {
    switch(corAlvo) {
        case "vermelho": return r > 150 && g < 100 && b < 100;
        case "verde":    return g > 150 && r < 100 && b < 100;
        case "azul":     return b > 150 && r < 100 && g < 100;
        case "amarelo":  return r > 150 && g > 150 && b < 100;
        case "rosa":     return r > 150 && b > 100 && g < 120;
        case "laranja":  return r > 150 && g > 80 && g < 150 && b < 80;
        case "roxo":     return r > 100 && b > 100 && g < 80;
    }
    return false;
}

function iniciarDeteccao() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    function detectar() {
        if (!corAlvo) {
            requestAnimationFrame(detectar);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        let detectado = false;

        for (let i = 0; i < frame.length; i += 4) {
            const r = frame[i];
            const g = frame[i + 1];
            const b = frame[i + 2];

            if (corDetectada(r, g, b, corAlvo)) {
                detectado = true;
                break;
            }
        }

        if (detectado) {
            ws.send(JSON.stringify({ type: "achei" }));
            corAlvo = null;

            const corRodada = document.getElementById("corRodada");
            corRodada.innerText = "🎉 Parabéns! Cor encontrada!";

            setTimeout(() => {
                corRodada.innerText = "Aguardando próxima rodada...";
            }, 2000);
        }

        requestAnimationFrame(detectar);
    }

    requestAnimationFrame(detectar);
}
