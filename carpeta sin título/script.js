
let saldo = 100;

function playGame() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("game").style.display = "block";
    spinRoulette();
}

function showInfo() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("info").style.display = "block";
}

function checkBalance() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("balance").style.display = "block";
    document.getElementById("saldo").innerText = saldo;
}

function backToMenu() {
    document.getElementById("game").style.display = "none";
    document.getElementById("info").style.display = "none";
    document.getElementById("balance").style.display = "none";
    document.getElementById("menu").style.display = "block";
}

function spinRoulette() {
    let number = Math.floor(Math.random() * 37); // numbers 0-36
    let color = (number === 0) ? "verde" : (number % 2 === 0 ? "rojo" : "negro");
    document.getElementById("result").innerText = `Número: ${number}, Color: ${color}`;
}

function placeBet() {
    let bet = prompt("Ingrese su apuesta:");
    if (bet <= saldo && bet > 0) {
        saldo -= bet;
        document.getElementById("saldo").innerText = saldo;
        alert("Apuesta realizada! Nuevo saldo: " + saldo);
    } else {
        alert("Saldo insuficiente o apuesta inválida.");
    }
}
