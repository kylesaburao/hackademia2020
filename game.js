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

        this.calculate_state = function (accelerate) {
            this.angular_velocity = clamp(this.angular_velocity, -0.1, 0.1);
            this.angle += this.angular_velocity;
            this.dx = clamp(this.dx, -10, 10);
            this.dy = clamp(this.dy, -10, 10);
            this.x += this.dx;
            this.y += this.dy;
            this.velocity = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
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

var render = function() {
    canvas_reset();
};

var starship = new PhysicsObject('img/starship.png', main_canvas);

var key_pressed = {
    up: false,
    left: false,
    right: false,
    down: false,
    control: false
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
    }
}

var loop_func = function() {
    canvas_reset();

    if (!key_pressed.control) {
        canvas_context.font = '12px arial';
        canvas_context.fillStyle = 'white';
        canvas_context.fillText('Flight mode', 100, 120);
        if (key_pressed.left) {
            starship.angular_velocity -= 0.0005;
        } else if (key_pressed.right) {
            starship.angular_velocity += 0.0005;
        }

        if (key_pressed.up) {
            starship.accelerate(0.1);
        }
    } else {
        canvas_context.font = '12px arial';
        canvas_context.fillStyle = 'white';
        canvas_context.fillText('Translation mode', 100, 120);
        if (key_pressed.down) {
            starship.translate_rear(0.005);
        }
        if (key_pressed.up) {
            starship.translate_forward(0.005);
        }
        if (key_pressed.left) {
            starship.translate_left(0.005);
        }
        if (key_pressed.right) {
            starship.translate_right(0.005);
        }
    }

    starship.calculate_state(key_pressed.up);
    starship.clamp_region();
    canvas_context.font = '20px arial';
    canvas_context.fillStyle = 'white';
    canvas_context.fillText('Velocity: ' + starship.velocity.toFixed(3)
        + ', x component: ' + starship.dx.toFixed(3)
        + ', y component: ' + starship.dy.toFixed(3)
        , 100, 100);
    starship.render(main_canvas);
    setTimeout(loop_func, 16);
};

console.log('hi');
loop_func();