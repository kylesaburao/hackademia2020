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

// https://stackoverflow.com/questions/37854355/wait-for-image-loading-to-complete-in-javascript
async function load_image(url, scale_factor) {
    let img;
    const load_promise = new Promise(resolve => {
        img = new Image();
        img.onload =  resolve;
        img.src = url;

    });

    await load_promise;
    img.width *= scale_factor;
    img.height *= scale_factor;
    return img;
}

class PhysicsObject {
    constructor(mass, image_src, canvas, image_scale) {
        this.canvas = canvas;
        this.ready = false;

        this.mass = mass;
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
        this.MAX_ACCELERATION_MAGNITUDE = 10;
        this.MAX_VELOCITY_MAGNITUDE = 10;

        load_image(image_src, image_scale).then(image => {
            this.image = image
            this.ready = true;
        });

        this.render = function () {
            if (this.ready) {
                var context = canvas.getContext('2d');
                context.save();
                context.translate(this.x, this.y);
                context.rotate(this.angle);
                context.drawImage(this.image, -this.image.width / 2, -this.image.height / 2, 
                    this.image.width, this.image.height);
                context.restore();
            }
        };

        this.translate_forward = function(force) {
            this.apply_force(force, 0.0);
        };
        this.translate_rear = function(force) {
            this.apply_force(force, Math.PI);
        };
        this.translate_left = function(force) {
            this.apply_force(force, -Math.PI/2);
        };
        this.translate_right = function(force) {
            this.apply_force(force, Math.PI/2);
        };

        this.apply_force = function(force, angular_offset=0.0) {
            const acceleration = force / this.mass;
            this.dx += acceleration * Math.sin(this.angle + this.core_angular_offset + angular_offset);
            this.dy -= acceleration * Math.cos(this.angle + this.core_angular_offset + angular_offset);
            this.dx = clamp(this.dx, -this.MAX_VELOCITY_MAGNITUDE, this.MAX_VELOCITY_MAGNITUDE);
            this.dy = clamp(this.dy, -this.MAX_VELOCITY_MAGNITUDE, this.MAX_VELOCITY_MAGNITUDE);
        };

        this.calculate_state = function() {
            this.angular_velocity = clamp(this.angular_velocity, -this.MAX_ANGULAR_MAGNITUDE, this.MAX_ANGULAR_MAGNITUDE);
            this.angle += this.angular_velocity;
            this.x += this.dx;
            this.y += this.dy;
            this.previous_velocity = this.velocity;
            this.velocity = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        };

        this.clamp_region = function(remove_on_leave) {
            var left_region = false;
            if (this.x < 0) {
                this.x = this.canvas.width;
                left_region = true;
            }
            if (this.x > this.canvas.width) {
                this.x = 0;
                left_region = true;
            }
            if (this.y > this.canvas.height) {
                this.y = 0;
                left_region = true;
            }
            if (this.y < 0) {
                this.y = this.canvas.height;
                left_region = true;
            }

            return remove_on_leave && left_region;
        };
    }
}

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

var render_velocity_indicator = function(canvas, object, max_magnitude, keys) {
    const INDICATOR_WIDTH = 400;
    const INDICATOR_HEIGHT = 200;

    const SIZE = 150;
    const X_OFFSET = canvas.width / 2 - INDICATOR_WIDTH / 2;
    const Y_OFFSET = canvas.height - INDICATOR_WIDTH / 2;
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
    ctx.stroke();

    ctx.font = '15px arial';
    ctx.fillStyle = 'white';
    ctx.fillText('v: ' + object.velocity.toFixed(2)
        + ', dx: ' + object.dx.toFixed(2)
        + ', dy: ' + object.dy.toFixed(2)
        + ', a: ' + (Math.abs(object.velocity - object.previous_velocity) / (16 / 1000)).toFixed(2)
        + ', \u03b8:' + object.angle.toFixed(2)
        + ', \u03C9: ' + object.angular_velocity.toFixed(2)
        , X_OFFSET, Y_OFFSET - 30);
    
    var control_text = ''
    if (keys.space) {
        control_text += 'TRANSLATION MODE'
    } else {
        control_text += 'FLIGHT MODE'
    }
    if (controls.fuel == 0.0) {
        control_text += ' | OUT OF FUEL'
    }
    ctx.fillText(control_text, X_OFFSET, Y_OFFSET - 10);

    // throttle
    ctx.strokeStyle = 'blue';
    ctx.beginPath();
    ctx.moveTo(X_OFFSET + SIZE + 25, Y_OFFSET + SIZE);
    ctx.lineTo(X_OFFSET + SIZE + 25, Y_OFFSET + SIZE - (SIZE * controls.throttle));
    ctx.stroke();

    // fuel
    ctx.strokeStyle = 'yellow';
    ctx.beginPath();
    ctx.moveTo(X_OFFSET + SIZE + 35, Y_OFFSET + SIZE);
    ctx.lineTo(X_OFFSET + SIZE + 35, Y_OFFSET + SIZE - (SIZE * (controls.fuel / controls.max_fuel)));
    ctx.stroke();

    ctx.font = '12px arial'
    ctx.fillText('Fuel: ' + controls.fuel.toFixed(2), X_OFFSET + SIZE + 45, Y_OFFSET + SIZE - 30)
    ctx.fillText('Burn Rate: ' + (0.1 * controls.throttle).toFixed(2), X_OFFSET + SIZE + 45, Y_OFFSET + SIZE - 15)
    ctx.fillText('Throttle: ' + (controls.throttle * 100).toFixed(2) + '%', X_OFFSET + SIZE + 45, Y_OFFSET + SIZE)

};

var render = function() {
    canvas_reset();
};

var starship = new PhysicsObject(1000, 'img/starship.png', main_canvas, 0.1);

var controls = {
    up: false,
    left: false,
    right: false,
    down: false,
    shift: false,
    control: false,
    space: false,
    f: false,
    throttle: 1,
    fuel: 100,
    max_fuel: 100
};

document.onkeydown = function(e) {
    if (e.keyCode == 38) {
        controls.up = true;
    } else if (e.keyCode == 37) {
        controls.left = true;
    } else if (e.keyCode == 39) {
        controls.right = true;
    } else if (e.keyCode == 40) {
        controls.down = true;
    } else if (e.keyCode == 17) {
        controls.control = true;
    } else if (e.keyCode == 32) {
        controls.space = true;
    } else if (e.keyCode == 70) {
        controls.f = true;
    } else if (e.keyCode == 16) {
        controls.shift = true;
    }
}
document.onkeyup = function(e) {
    if (e.keyCode == 38) {
        controls.up = false
    } else if (e.keyCode == 37) {
        controls.left = false;
    } else if (e.keyCode == 39) {
        controls.right = false;
    } else if (e.keyCode == 40) {
        controls.down = false;
    } else if (e.keyCode == 17) {
        controls.control = false;
    } else if (e.keyCode == 32) {
        controls.space = false;
    } else if (e.keyCode == 70) {
        controls.f = false;
    } else if (e.keyCode == 16) {
        controls.shift = false;
    }
}

var cars = [];
var last_car_launched = 0;

class AutopilotData {
    constructor(physicsObject) {
        this.physicsObject = physicsObject;
        this.target_angle = null;

        this.set_target_angle_offset = function(angular_offset_magnitude) {
            var target_angle_left = this.physicsObject.angle - angular_offset_magnitude;
            var target_angle_right = this.physicsObject.angle + angular_offset_magnitude;

            this.target_angle = (Math.abs(target_angle_left - this.physicsObject.angle) 
                <= Math.abs(target_angle_right - this.physicsObject.angle))
                ? target_angle_left : target_angle_right;
        }

        this.is_target_angle_set = function() {
            return this.target_angle != null;
        }

        this.clear_target_angle = function() {
            this.target_angle = null;
        }

        this.move_to_target_angle = function() {
            const CURRENT_ANGLE = this.physicsObject.angle;
            const ERROR = CURRENT_ANGLE - this.target_angle;
            this.physicsObject.angular_velocity += -1 * 0.0025 * (ERROR / Math.PI);
            if (ERROR <= 0.1995) {
                this.physicsObject.angular_velocity *= 0.625;
            }
        }
    };
};

var autopilot = new AutopilotData(starship);

var loop_func = function() {
    canvas_reset();

    if (controls.shift) {
        controls.throttle += 0.02;
    } else if (controls.control) {
        controls.throttle -= 0.02;
    }

    controls.throttle = clamp(controls.throttle, 0.40, 1.0);

    if (!controls.space) {
        if (controls.left) {
            starship.angular_velocity -= 0.002;
        } else if (controls.right) {
            starship.angular_velocity += 0.002;
        }

        const MAIN_THRUST = 100;
        if (controls.up && controls.fuel > 0) {
            starship.apply_force(controls.throttle * MAIN_THRUST);
            controls.fuel -= 0.1 * controls.throttle;
            controls.fuel = clamp(controls.fuel, 0.0, controls.max_fuel);
        }
    } else {
        if (controls.down) {
            starship.translate_rear(7.5);
        }
        if (controls.up) {
            starship.translate_forward(7.5);
        }
        if (controls.left) {
            starship.translate_left(7.5);
        }
        if (controls.right) {
            starship.translate_right(7.5);
        }
    }

    starship.calculate_state();
    starship.clamp_region();

    render_velocity_indicator(main_canvas, starship, 10, controls);

    if (controls.f) {
        // todo: implement mass and new acceleration model with f=ma
        var current_time = new Date().getTime();
        if (current_time - last_car_launched >= 250) {
            last_car_launched = current_time;
            var new_car = new PhysicsObject(1, 'img/tesla.png', main_canvas, 0.05);
            new_car.MAX_VELOCITY_MAGNITUDE = 20;
            new_car.angle = starship.angle;
            const LAUNCH_FORCE = 500;
            new_car.angular_velocity = starship.angular_velocity / 2;
            new_car.x = starship.x + 50 * Math.sin(new_car.angle);
            new_car.y = starship.y - 50 * Math.cos(new_car.angle);
            new_car.translate_forward(LAUNCH_FORCE);
            starship.translate_rear(LAUNCH_FORCE);
            cars.push(new_car);
        }
    }

    var car_deletion_queue = [];
    cars.forEach(function(v, i, a) {
        v.calculate_state();
        if (v.clamp_region(true)) {
            car_deletion_queue.push(i);
        }
    });
    car_deletion_queue.forEach(function(v, i, a) {
        cars.splice(v, 1);
        console.log('deleting ' + v);
    });
    cars.forEach(function(v, i, a) {
        v.render(main_canvas);
    });

    starship.render(main_canvas);
    setTimeout(loop_func, 16);
};

console.log('hi');
loop_func();