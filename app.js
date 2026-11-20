
"use strict";

const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
}

const params = new URLSearchParams(window.location.search);
const fen = params.get("fen");

if (typeof Chess === "undefined") {
    document.getElementById("status").textContent =
        "خطا در بارگذاری موتور قوانین شطرنج.";
    throw new Error("Chess.js could not be loaded.");
}

if (!fen) {
    document.getElementById("status").textContent =
        "موقعیت شطرنج دریافت نشده است.";
    throw new Error("FEN is missing.");
}

let game;

try {
    game = new Chess(fen);

    if (game.game_over()) {
        throw new Error("Position is already over.");
    }
} catch (error) {
    document.getElementById("status").textContent =
        "موقعیت شطرنج معتبر نیست.";
    throw error;
}

const boardElement = document.getElementById("board");
const rankLabels = document.getElementById("rankLabels");
const fileLabels = document.getElementById("fileLabels");

const statusElement = document.getElementById("status");
const turnElement = document.getElementById("turn");
const selectedMoveElement = document.getElementById("selectedMove");

const submitButton = document.getElementById("submitButton");
const undoButton = document.getElementById("undoButton");
const cancelButton = document.getElementById("cancelButton");

const promotionModal = document.getElementById("promotionModal");

const PIECES = {
    w: {
        k: "♔",
        q: "♕",
        r: "♖",
        b: "♗",
        n: "♘",
        p: "♙"
    },
    b: {
        k: "♚",
        q: "♛",
        r: "♜",
        b: "♝",
        n: "♞",
        p: "♟"
    }
};

let selectedSquare = null;
let legalTargets = [];
let selectedMove = null;
let pendingPromotion = null;

const flipped = game.turn() === "b";

function getSquareName(row, col) {
    const file = flipped
        ? "hgfedcba"[col]
        : "abcdefgh"[col];

    const rank = flipped
        ? String(row + 1)
        : String(8 - row);

    return file + rank;
}

function createCoordinates() {
    rankLabels.innerHTML = "";
    fileLabels.innerHTML = "";

    for (let row = 0; row < 8; row++) {
        const rank = document.createElement("span");

        rank.textContent = flipped
            ? String(row + 1)
            : String(8 - row);

        rankLabels.appendChild(rank);
    }

    for (let col = 0; col < 8; col++) {
        const file = document.createElement("span");

        file.textContent = flipped
            ? "hgfedcba"[col]
            : "abcdefgh"[col];

        fileLabels.appendChild(file);
    }
}

function updateInformation() {
    turnElement.textContent =
        game.turn() === "w" ? "سفید" : "سیاه";

    if (game.in_check()) {
        statusElement.textContent =
            "شاه در وضعیت کیش قرار دارد!";
    } else {
        statusElement.textContent =
            "مهره را روی خانه مقصد رها کنید.";
    }

    selectedMoveElement.textContent =
        selectedMove
            ? selectedMove.from + " → " + selectedMove.to
            : "---";

    submitButton.disabled = !selectedMove;
    undoButton.disabled = !selectedMove;
}

function renderBoard() {
    boardElement.innerHTML = "";

    const board = game.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {

            const squareName = getSquareName(row, col);

            const piece = game.get(squareName);

            const square = document.createElement("div");

            square.className =
                "square " +
                ((row + col) % 2 === 0 ? "light" : "dark");

            square.dataset.square = squareName;

            if (selectedSquare === squareName) {
                square.classList.add("selected");
            }

            if (legalTargets.includes(squareName)) {
                square.classList.add("legal");

                if (piece) {
                    square.classList.add("has-piece");
                }
            }

            if (piece) {
                const pieceElement = document.createElement("span");

                pieceElement.className =
                    "piece " +
                    (piece.color === "w"
                        ? "white-piece"
                        : "black-piece");

                pieceElement.textContent =
                    PIECES[piece.color][piece.type];

                square.appendChild(pieceElement);
            }

            square.addEventListener(
                "pointerdown",
                handlePointerDown
            );

            square.addEventListener(
                "pointerup",
                handlePointerUp
            );

            square.addEventListener(
                "click",
                handleClick
            );

            boardElement.appendChild(square);
        }
    }

    updateInformation();
}

function selectSquare(squareName) {
    const piece = game.get(squareName);

    if (!piece || piece.color !== game.turn()) {
        return false;
    }

    selectedSquare = squareName;

    legalTargets = game.moves({
        square: squareName,
        verbose: true
    }).map(move => move.to);

    renderBoard();

    return true;
}

function clearSelection() {
    selectedSquare = null;
    legalTargets = [];

    renderBoard();
}

function handlePointerDown(event) {
    if (selectedMove || pendingPromotion) {
        return;
    }

    const squareName = event.currentTarget.dataset.square;

    if (selectSquare(squareName)) {
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }
}

function handlePointerUp(event) {
    if (!selectedSquare || selectedMove || pendingPromotion) {
        return;
    }

    const target = document.elementFromPoint(
        event.clientX,
        event.clientY
    );

    const squareElement = target?.closest(".square");

    if (!squareElement) {
        return;
    }

    const destination = squareElement.dataset.square;

    if (destination === selectedSquare) {
        return;
    }

    attemptMove(selectedSquare, destination);
}

function handleClick(event) {
    if (selectedMove || pendingPromotion) {
        return;
    }

    const squareName = event.currentTarget.dataset.square;

    if (selectedSquare && legalTargets.includes(squareName)) {
        attemptMove(selectedSquare, squareName);
        return;
    }

    selectSquare(squareName);
}

function attemptMove(from, to) {
    const possibleMoves = game.moves({
        square: from,
        verbose: true
    }).filter(move => move.to === to);

    if (!possibleMoves.length) {
        statusElement.textContent =
            "این حرکت قانونی نیست.";

        clearSelection();
        return;
    }

    const promotions = possibleMoves.filter(
        move => move.flags.includes("p")
    );

    if (promotions.length) {
        pendingPromotion = { from, to };

        promotionModal.classList.remove("hidden");
        return;
    }

    executeMove(from, to);
}

function executeMove(from, to, promotion = "q") {
    const move = game.move({
        from,
        to,
        promotion
    });

    if (!move) {
        statusElement.textContent =
            "حرکت قابل اجرا نیست.";

        clearSelection();
        return;
    }

    selectedMove = {
        from: move.from,
        to: move.to,
        promotion: move.promotion || null,
        san: move.san,
        uci: move.from + move.to + (move.promotion || "")
    };

    selectedSquare = null;
    legalTargets = [];
    pendingPromotion = null;

    promotionModal.classList.add("hidden");

    statusElement.textContent =
        "حرکت " + move.san + " انتخاب شد. برای ارسال به ربات، ثبت حرکت را بزنید.";

    renderBoard();
}

document.querySelectorAll("[data-piece]").forEach(button => {
    button.addEventListener("click", () => {
        if (!pendingPromotion) {
            return;
        }

        const promotion = button.dataset.piece;

        const from = pendingPromotion.from;
        const to = pendingPromotion.to;

        executeMove(from, to, promotion);
    });
});

undoButton.addEventListener("click", () => {
    if (!selectedMove) {
        return;
    }

    game.undo();

    selectedMove = null;

    statusElement.textContent =
        "حرکت برگشت داده شد.";

    renderBoard();
});

submitButton.addEventListener("click", () => {
    if (!selectedMove) {
        return;
    }

    const payload = {
        move: selectedMove.uci
    };

    if (tg) {
        submitButton.disabled = true;

        statusElement.textContent =
            "در حال ارسال حرکت به ربات...";

        tg.sendData(JSON.stringify(payload));
    } else {
        statusElement.textContent =
            "این صفحه خارج از تلگرام باز شده است. حرکت: " +
            selectedMove.uci;
    }
});

cancelButton.addEventListener("click", () => {
    if (tg) {
        tg.close();
    } else {
        window.history.back();
    }
});

createCoordinates();
renderBoard();
