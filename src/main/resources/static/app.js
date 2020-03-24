var stompClient = null;
var worldMap = null;
var boat = null;
var radius = 5;
var minimapScale = 5;

function setConnected(connected) {
    $("#connect").prop("disabled", connected);
    $("#disconnect").prop("disabled", !connected);
    if (connected) {
        $("#conversation").show();
    }
    else {
        $("#conversation").hide();
    }
    $("#greetings").html("");
}


function connect() {
    document.getElementById("message").innerHTML = "";
    generateTable();
    var socket = new SockJS('/treasurehunter');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
        setConnected(true);
        console.log('Connected: ' + frame);
        stompClient.subscribe('/user/queue/changes', function(jsonData){
            var response = JSON.parse(jsonData.body);
            updateMoves(response.moves);
            boat = JSON.parse(response.boat);
            updateMap2(response.mapChanges);
            updateState(response.state);
            drawCanvas();
        });
        stompClient.subscribe('/user/queue/reply', function (data) {
            var response = JSON.parse(data.body);
            updateMoves(response.moves);
            worldMap = JSON.parse(response.map);
            boat = JSON.parse(response.boat);
            drawCanvas();
            drawMap2();
        });
        stompClient.subscribe('/user/queue/minimap', function(data){
            updateCanvas(JSON.parse(data.body));
        });
        stompClient.send("/app/newgame", {}, '');
    });
}

function updateCanvas(data){
    drawCanvas();
    const canvas = document.getElementById('canvasMap');
    const ctx = canvas.getContext('2d');
    for (var i = 0; i < data.length; i++){
        ctx.fillStyle = "white";
        if (data[i].type == "boat"){
            ctx.fillStyle = "black";
        } else if (data[i].type == "treasure"){
            ctx.fillStyle = "yellow";
        }
        ctx.fillRect(data[i].x * minimapScale, data[i].y * minimapScale, minimapScale, minimapScale);
    }


}

function generateTable(){
    var tbl = "";
    for (var i = 0; i < radius * 2; i++){
        tbl += "<tr>"
        for (var j = 0; j < radius * 2; j++){
            tbl += "<td><img id='" + i + "-"+ j +"' src='/icons/bounds.png'></img></td>";
        }
        tbl += "</tr>";
    }
    document.getElementById("grid").innerHTML = tbl;
}

function drawCanvas(){
    var scale = minimapScale;
    document.getElementById("canvasDiv").innerHTML = "<canvas id='canvasMap' width='" + worldMap[0].length * scale+ "' height='" + worldMap.length * scale +  "'></canvas>";
    const canvas = document.getElementById('canvasMap');
    const ctx = canvas.getContext('2d');

    for (var i = 0; i < worldMap.length; i++){
        for (var j = 0; j < worldMap[0].length; j++){
            var element = worldMap[i][j];
            var colour = 'blue';
            if (element.type == "boat"){
                colour = 'black';
            } else if (element.type == "treasure"){
                colour = 'yellow';
            } else if (element.inPath == true){
                colour = 'white';
            } else if (element.type == "land"){
                colour = 'green';
            }
            ctx.fillStyle = colour;
            ctx.fillRect(j * scale, i * scale, scale, scale);
        }
    }

}

function drawOverWorld(){
    var map = "";
    for (var i = 0; i < worldMap.length; i++){
        var row = "<p>"
        for (var j = 0; j < worldMap[0].length; j++){
            if (worldMap[i][j].type == "boat"){
                row += "*";
            } else {
                row += "-";
            }
        }
        row += "</p>";
        map += row;
    }
    document.getElementById("overWorld").innerHTML = map;
}

function displayTreasure(){
    drawMap2();
}

function displayWin(){
    displayTreasure();
    document.getElementById("message").innerHTML = "You won! Press Start Game to play again.";
    disconnect();
}

function displayLoss(){
    displayTreasure();
    document.getElementById("message").innerHTML = "Game Over - Press Start Game to play again.";
    disconnect();
}

function updateState(state){
    if (state == "won"){
        displayWin();
    } else if (state == "lost"){
        displayLoss();
    }
}

function updateMoves(moves){
    document.getElementById("numMoves").innerHTML = moves;
}


function updateMap2(changes){
    var changes = JSON.parse(changes);
    for (var i = 0; i < changes.length; i++){
        var element = changes[i];
        worldMap[element.y][element.x] = element;
    }
    drawMap2();
}


function drawMap2(){
    var boatX = boat.x;
    var boatY = boat.y;

    var x = 0;
    var y = 0;
    for (var i = boatY - radius ; i < boatY + radius; i++){
        for (var j = boatX - radius; j < boatX + radius; j++){
            var pic = "";
            if (i < 0 || j < 0 || i >= worldMap.length || j >= worldMap[0].length){
                pic = '/icons/bounds.png';
            } else { //in bounds 
                if (worldMap[i][j].hidden){
                    pic = '/icons/water.png';
                } else {
                    pic = "/icons/" + worldMap[i][j].type + ".png";
                }  
            }
            $("#"+ y +"-" + x).attr("src", pic);
            x = x + 1;
        }
        x = 0;
        y = y + 1;
    }

}


function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    setConnected(false);
    console.log("Disconnected");
}

function moveUp(){
    stompClient.send("/app/command", {}, JSON.stringify({'command' : 'up'}));
    stompClient.send("/app/pathfind", {}, JSON.stringify({'map': asciiMap()}));
}

function moveDown(){
    stompClient.send("/app/command", {}, JSON.stringify({'command' : 'down'}));
    stompClient.send("/app/pathfind", {}, JSON.stringify({'map': asciiMap()}));
}

function moveLeft(){
    stompClient.send("/app/command", {}, JSON.stringify({'command' : 'left'}));
    stompClient.send("/app/pathfind", {}, JSON.stringify({'map': asciiMap()}));
}

function moveRight(){
    stompClient.send("/app/command", {}, JSON.stringify({'command' : 'right'}));
    stompClient.send("/app/pathfind", {}, JSON.stringify({'map': asciiMap()}));
}

$(function () {
    $("form").on('submit', function (e) {
        e.preventDefault();
    });
    $( "#connect" ).click(function() { connect(); });
    $( "#disconnect" ).click(function() { disconnect(); });
    $( "#send" ).click(function() { sendName(); });
});

function asciiMap(){
    var res = [];
    for (var i = 0; i < worldMap.length; i++){
        var row = [];
        for (var j = 0; j < worldMap[0].length; j++){
            if (worldMap[i][j].type == "land"){
                row.push("L");
            } else if (worldMap[i][j].type == "boat"){
                row.push("B");
            } else if (worldMap[i][j].type == "treasure"){
                row.push("T");
            } else {
                row.push("W");
            }
        }
        res.push(row)
    }
    return res;        
}

$(document).keydown(function(e) {
    switch(e.which) {
        case 37: // left
        moveLeft();
        break;

        case 38: // up
        moveUp();
        break;

        case 39: // right
        moveRight();
        break;

        case 40: // down
        moveDown();
        break;

        default: return; // exit this handler for other keys
    }
    e.preventDefault(); // prevent the default action (scroll / move caret)
});