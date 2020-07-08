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
        this.core_angular_offset = 0.0;
        this.previous_velocity = 0.0;
        this.velocity = 0.0;
        this.angular_velocity = 0.0;

        this.MAX_ANGULAR_MAGNITUDE = 0.1;

        var image = new Image();
        this.image = image;
        this.image.src = image_src;
        this.image.onload = function () {
            this.width = image.width / 10;
            this.height = image.height / 10;
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

        this.translate_forward = function(acceleration) {
            this.accelerate(acceleration, 0.0);
        };
        this.translate_rear = function(acceleration) {
            this.accelerate(acceleration, Math.PI);
        };
        this.translate_left = function(acceleration) {
            this.accelerate(acceleration, -Math.PI/2);
        };
        this.translate_right = function(acceleration) {
            this.accelerate(acceleration, Math.PI/2);
        };

        this.accelerate = function(acceleration, angular_offset=0.0) {
            this.dx += acceleration * Math.sin(this.angle + this.core_angular_offset + angular_offset);
            this.dy -= acceleration * Math.cos(this.angle + this.core_angular_offset + angular_offset);
        };

        this.calculate_state = function (accelerate, decay_movement) {
            this.angular_velocity = clamp(this.angular_velocity, -this.MAX_ANGULAR_MAGNITUDE, this.MAX_ANGULAR_MAGNITUDE);
            this.angle += this.angular_velocity;
            this.dx = clamp(this.dx, -10, 10);
            this.dy = clamp(this.dy, -10, 10);
            this.x += this.dx;
            this.y += this.dy;

            this.previous_velocity = this.velocity;

            if (decay_movement) {
                this.velocity *= 0.98;
                this.dx *= 0.98;
                this.dy *= 0.98;
                this.angular_velocity *= 0.98;
            } else {
                this.velocity = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
            }
        };

        this.clamp_region = function() {
            if (this.x < 0) {
                this.x = this.canvas.width;
            }
            if (this.x > this.canvas.width) {
                this.x = 0;
            }
            if (this.y > this.canvas.height) {
                this.y = 0;
            }
            if (this.y < 0) {
                this.y = this.canvas.height;
            }
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

var render_velocity_indicator = function(canvas, object, max_magnitude) {
    const X_OFFSET = 50;
    const Y_OFFSET = 150;
    const SIZE = 150;
    const X_CENTRE = X_OFFSET + SIZE / 2;
    const Y_CENTRE = Y_OFFSET + SIZE / 2;
    const ctx = canvas.getContext('2d');

    // Axis
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X_OFFSET, Y_OFFSET + SIZE / 2)
    ctx.lineTo(X_OFFSET + SIZE, Y_OFFSET + SIZE / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X_OFFSET + SIZE / 2, Y_OFFSET);
    ctx.lineTo(X_OFFSET + SIZE / 2, Y_OFFSET + SIZE);
    ctx.stroke();

    // Velocity indicator
    const Y_DELTA = (object.dy / max_magnitude) * SIZE / 2;
    const X_DELTA = (object.dx / max_magnitude) * SIZE / 2;
    const X_TIP = X_CENTRE + X_DELTA;
    const Y_TIP = Y_CENTRE + Y_DELTA;
    ctx.beginPath();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'blue';
    ctx.moveTo(X_CENTRE, Y_CENTRE);
    ctx.lineTo(X_TIP, Y_TIP);
    ctx.stroke();

    // Rotation indicator
    ctx.beginPath();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'grey';
    ctx.moveTo(X_TIP, Y_TIP);
    const ANGULAR_SCALE = Math.max(6, 20 * (Math.abs(object.angular_velocity) / object.MAX_ANGULAR_MAGNITUDE));
    ctx.lineTo(X_TIP - ANGULAR_SCALE * Math.cos(object.angle + Math.PI / 2), Y_TIP - ANGULAR_SCALE * Math.sin(object.angle + Math.PI / 2));
    console.log(object.angle)
    ctx.stroke();

    ctx.font = '20px arial';
    ctx.fillStyle = 'white';
    ctx.fillText('v: ' + object.velocity.toFixed(2)
        + ', dx: ' + object.dx.toFixed(2)
        + ', dy: ' + object.dy.toFixed(2)
        + ', a: ' + (Math.abs(object.velocity - object.previous_velocity) / (16 / 1000)).toFixed(2)
        + ', \u03C9: ' + object.angular_velocity.toFixed(2)
        , X_OFFSET, 100);
};

var render = function() {
    canvas_reset();
};

var starship = new PhysicsObject('img/starship.png', main_canvas);

var key_pressed = {
    up: false,
    left: false,
    right: false,
    down: false,
    control: false,
    space: false
};

document.onkeydown = function(e) {
    if (e.keyCode == 38) {
        key_pressed.up = true;
    } else if (e.keyCode == 37) {
        key_pressed.left = true;
    } else if (e.keyCode == 39) {
        key_pressed.right = true;
    } else if (e.keyCode == 40) {
        key_pressed.down = true;
    } else if (e.keyCode == 17) {
        key_pressed.control = true;
    } else if (e.keyCode == 32) {
        key_pressed.space = true;
    }
}
document.onkeyup = function(e) {
    if (e.keyCode == 38) {
        key_pressed.up = false
    } else if (e.keyCode == 37) {
        key_pressed.left = false;
    } else if (e.keyCode == 39) {
        key_pressed.right = false;
    } else if (e.keyCode == 40) {
        key_pressed.down = false;
    } else if (e.keyCode == 17) {
        key_pressed.control = false;
    } else if (e.keyCode == 32) {
        key_pressed.space = false;
    }
}

var loop_func = function() {
    canvas_reset();

    if (!key_pressed.control) {
        canvas_context.font = '12px arial';
        canvas_context.fillStyle = 'white';
        canvas_context.fillText('Flight mode', 50, 120);
        if (key_pressed.left) {
            starship.angular_velocity -= 0.002;
        } else if (key_pressed.right) {
            starship.angular_velocity += 0.002;
        }

        if (key_pressed.up) {
            starship.accelerate(0.1);
        }
    } else {
        canvas_context.font = '12px arial';
        canvas_context.fillStyle = 'white';
        canvas_context.fillText('Translation mode', 50, 120);
        if (key_pressed.down) {
            starship.translate_rear(0.01);
        }
        if (key_pressed.up) {
            starship.translate_forward(0.01);
        }
        if (key_pressed.left) {
            starship.translate_left(0.01);
        }
        if (key_pressed.right) {
            starship.translate_right(0.01);
        }
    }

    if (key_pressed.space) {
        canvas_context.font = '12px arial';
        canvas_context.fillStyle = 'white';
        canvas_context.fillText('Motion arrest', 50, 135);
    }

    starship.calculate_state(key_pressed.up, key_pressed.space);
    starship.clamp_region();

    render_velocity_indicator(main_canvas, starship, 10);
    starship.render(main_canvas);
    setTimeout(loop_func, 16);
};

console.log('hi');
loop_func();