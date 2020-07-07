var main_canvas = document.getElementById('main_canvas');
var canvas_context = main_canvas.getContext('2d');

main_canvas.width = main_canvas.offsetWidth;
main_canvas.height = main_canvas.offsetHeight;

var musk_image = new Image();
musk_image.src = 'img/elon_musk.png'

var starship_image = new Image();
starship_image.src = 'img/starship.png'
starship_image.onload = function () {
    starship_image.height =  starship_image.height / 4;
    starship_image.width = starship_image.width / 4;
};


var starship_x = 0;
var starship_y = 0;
var starship_dx = 0;
var starship_dy = 0;
const max_acceleration_component = 5;
const max_velocity_component = 25;

var mouse = {
    x: 0,
    y: 0
};

var mouse_moved = function(e) {
    var bounding_box = main_canvas.getBoundingClientRect();
    mouse.x = e.pageX - bounding_box.left;
    mouse.y = e.pageY - bounding_box.top;
};

document.addEventListener('mousemove', mouse_moved);

var setup_controls = function(){
    document.addEventListener('keydown', function(e) {
        if (e.which == 37) {
            if (starship_dx > -max_acceleration_component) {
                starship_dx = starship_dx - 1;
            }
        }
    }); // left
    document.addEventListener('keydown', function(e) {
        if (e.which == 40) {
            if (starship_dy < max_acceleration_component) {
                starship_dy = starship_dy + 1;
            }
        }
    }); // down
    document.addEventListener('keydown', function(e) {
        if (e.which == 38) {
            if (starship_dy > -max_acceleration_component) {
                starship_dy = starship_dy - 1;
            }
        }
    }); // up
    document.addEventListener('keydown', function(e) {
        if (e.which == 39) {
            if (starship_dx < max_acceleration_component) {
                starship_dx = starship_dx + 1;
            }
        }
    }); // right
};

var starship_flight = function() {
    starship_x += starship_dx;
    starship_y += starship_dy;
};

var starship_render = function(x, y, lookx, looky) {
    // https://stackoverflow.com/questions/40120470/javascript-making-image-rotate-to-always-look-at-mouse-cursor
    canvas_context.setTransform(1, 0, 0, 1, x, y);  // set scale and origin
    canvas_context.rotate(Math.atan2(looky - y, lookx - x) + (Math.PI / 2)); // set angle
    canvas_context.drawImage(starship_image,-starship_image.width / 2, -starship_image.height / 2, starship_image.width, starship_image.height); // draw image
    canvas_context.setTransform(1, 0, 0, 1, 0, 0); // restore default not needed if you use setTransform for other rendering operations
};

var canvas_reset = function() {
    canvas_context.clearRect(0, 0, main_canvas.width, main_canvas.height);
};

var render = function() {
    canvas_reset();
    starship_render(starship_x, starship_y, mouse.x, mouse.y);
};

setup_controls();

var loop_func = function() {
    starship_flight();
    render();
    setTimeout(loop_func, 16);
};

console.log('hi');
loop_func();