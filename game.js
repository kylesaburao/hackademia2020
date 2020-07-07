var main_canvas = document.getElementById('main_canvas');
var canvas_context = main_canvas.getContext('2d');

main_canvas.width = window.innerWidth;
main_canvas.height = window.innerHeight;

window.addEventListener('resize', function (){
    main_canvas.width = window.innerWidth;
    main_canvas.height = window.innerHeight;
    }, 
    false);

var musk_image = new Image();
musk_image.src = 'img/elon_musk.png'

function clamp(x, min, max) {
    if (x < min) {
        return min;
    } else if (x > max) {
        return max;
    }
    return x;
}

class PhysicsObject {
    constructor(image_src, canvas) {
        this.canvas = canvas;

        this.dx = 0;
        this.dy = 0;
        this.x = canvas.width / 2;;
        this.y = canvas.height / 2;
        this.width = 0.0;
        this.height = 0.0;
        this.angle = 0.0;
        this.velocity = 0.0;
        this.angular_velocity = 0.0;

        var image = new Image();
        this.image = image;
        this.image.src = image_src;
        this.image.onload = function () {
            this.width = image.width / 5;
            this.height = image.height / 5;
            // this.height = this.image.height;
        };

        this.render = function () {
            var context = canvas.getContext('2d');
            context.save();
            context.translate(this.x, this.y);
            context.rotate(this.angle);
            context.drawImage(this.image, -this.image.width / 2, -this.image.height / 2, 
                this.image.width, this.image.height);
            context.restore();
        };

        this.calculate_state = function (angle) {
            this.angle = angle;
            if (key_pressed.up) { // bug no thrust when pointing up
                this.dx -= this.velocity * Math.sin(this.angle);
                this.dy += this.velocity * Math.cos(this.angle);

            }
            if (true) {
                // this.dx += 0.01 * Math.sin(Math.PI);
                // this.dy -= 0.01 * Math.cos(Math.PI);
            }
            this.dx = clamp(this.dx, -10, 10);
            this.dy = clamp(this.dy, -10, 10);
            this.x += this.dx;
            this.y += this.dy;
        };
    }
}

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


var canvas_reset = function() {
    canvas_context.clearRect(0, 0, main_canvas.width, main_canvas.height);
};

var render = function() {
    canvas_reset();
};

var starship = new PhysicsObject('img/starship.png', main_canvas);

var key_pressed = {
    up: false
};

document.onkeydown = function(e) {
    if (e.keyCode == 38) {
        key_pressed.up = true;
    }
}
document.onkeyup = function(e) {
    if (e.keyCode == 38) {
        key_pressed.up = false
    }
}

var loop_func = function() {
    canvas_reset();
    var delta_x = mouse.x - starship.x;
    var delta_y = mouse.y - starship.y;
    var inner = delta_x * delta_x + delta_y + delta_y;
    var magnitude = 0;
    if (inner > 0) {
        magnitude = Math.sqrt(inner);
    }

    starship.velocity = -magnitude * 0.00125;
    if (starship.velocity > 1) {
        starship.velocity = 1;
    } else if (starship.velocity < -1) {
        starship.velocity = -1;
    }

    var target_angle = Math.atan2(mouse.y - starship.y, mouse.x - starship.x) + Math.PI / 2;
    starship.calculate_state(target_angle);
    starship.render(main_canvas);
    setTimeout(loop_func, 16);
};

console.log('hi');
loop_func();