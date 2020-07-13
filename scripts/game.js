var main_canvas = document.getElementById('main_canvas')
var canvas_context = main_canvas.getContext('2d')

main_canvas.width = window.innerWidth
main_canvas.height = window.innerHeight

window.addEventListener('resize', function (){
    main_canvas.width = window.innerWidth
    main_canvas.height = window.innerHeight
    }, 
    false
)

var background_music = new Audio('../audio/spacex.mp3')

function clamp(x, min, max) {
    if (x < min) {
        return min
    } else if (x > max) {
        return max
    }
    return x
}

// https://stackoverflow.com/questions/37854355/wait-for-image-loading-to-complete-in-javascript
async function load_image(url, scale_factor) {
    let img
    const load_promise = new Promise(resolve => {
        img = new Image()
        img.onload = resolve
        console.log('Loading URL ' + url)
        img.src = url
    })

    await load_promise
    img.width *= scale_factor
    img.height *= scale_factor
    return img
}

class PhysicsObject {
    constructor(mass, image_src, canvas, image_scale) {
        this.canvas = canvas
        this.ready = false

        this.mass = mass
        this.extra_mass = 0.0
        this.dx = 0
        this.dy = 0
        this.x = canvas.width / 2
        this.y = canvas.height / 2
        this.width = 0.0
        this.height = 0.0
        this.angle = 0.0
        this.core_angular_offset = 0.0
        this.previous_velocity = 0.0
        this.velocity = 0.0
        this.angular_velocity = 0.0

        this.MAX_ANGULAR_MAGNITUDE = 0.1
        this.MAX_ACCELERATION_MAGNITUDE = 10
        this.MAX_VELOCITY_MAGNITUDE = 10

        load_image(image_src, image_scale).then(image => {
            this.update_image(image) 
        })

        this.update_image = function(image) {
            this.image = image
            this.ready = true
            this.width = image.width
            this.height = image.height
        }

        this.render = function () {
            if (this.ready) {
                var context = canvas.getContext('2d')
                context.save()
                context.translate(this.x, this.y)
                context.rotate(this.angle)
                context.drawImage(this.image, -this.image.width / 2, -this.image.height / 2, 
                    this.image.width, this.image.height)
                context.restore()
            }
        }

        this.translate_forward = function(force) {
            this.apply_force(force, 0.0)
        }
        this.translate_rear = function(force) {
            this.apply_force(force, Math.PI)
        }
        this.translate_left = function(force) {
            this.apply_force(force, -Math.PI/2)
        }
        this.translate_right = function(force) {
            this.apply_force(force, Math.PI/2)
        }

        this.apply_force = function(force, angular_offset=0.0) {
            const acceleration = force / (this.mass + this.extra_mass)
            this.dx += acceleration * Math.sin(this.angle + this.core_angular_offset + angular_offset)
            this.dy -= acceleration * Math.cos(this.angle + this.core_angular_offset + angular_offset)
            this.dx = clamp(this.dx, -this.MAX_VELOCITY_MAGNITUDE, this.MAX_VELOCITY_MAGNITUDE)
            this.dy = clamp(this.dy, -this.MAX_VELOCITY_MAGNITUDE, this.MAX_VELOCITY_MAGNITUDE)
        }

        this.calculate_state = function() {
            this.angular_velocity = clamp(this.angular_velocity, -this.MAX_ANGULAR_MAGNITUDE, this.MAX_ANGULAR_MAGNITUDE)
            this.angle += this.angular_velocity
            this.x += this.dx
            this.y += this.dy
            this.previous_velocity = this.velocity
            this.velocity = Math.sqrt(this.dx * this.dx + this.dy * this.dy)
        }

        this.clamp_region = function(remove_on_leave) {
            var left_region = false
            if (this.x < 0) {
                if (!remove_on_leave) {
                    this.x = this.canvas.width
                }
                left_region = true
            }
            if (this.x > this.canvas.width) {
                if (!remove_on_leave) {
                    this.x = 0
                }
                left_region = true
            }
            if (this.y > this.canvas.height) {
                if (!remove_on_leave) {
                    this.y = 0
                }
                left_region = true
            }
            if (this.y < 0) {
                if (!remove_on_leave) {
                    this.y = this.canvas.height
                }
                left_region = true
            }

            return remove_on_leave && left_region
        }

        this.distance_to = function(other_object) {
            var dx = this.x - other_object.x
            var dy = this.y - other_object.y
            return Math.sqrt((dx * dx) + (dy * dy))
        }

        this.has_collided = function(other_object) {
            var this_radius = (this.width + this.height) / 2
            var other_radius = (other_object.width + other_object.height) / 2
            return this.distance_to(other_object) < (this_radius + other_radius) - 25
        }
    }
}

class PhysicsShortAnimation {
    constructor(canvas, image_list, scale, loops, physics_src) {

        this.physicsObject = null
        this.images = []
        this.image_index = 0
        this.loops_left = loops
        this.images_left = image_list.length.valueOf()

        this.init_image = function(image_list, index) {
            var src = image_list[index].valueOf()
            load_image(src, scale).then(image => {
                this.images.push(image)
                this.images_left -= 1

                if (index == 0) {
                    this.physicsObject = new PhysicsObject(1.0, src, canvas, scale)
                    this.physicsObject.x = physics_src.x
                    this.physicsObject.y = physics_src.y
                    this.physicsObject.dx = physics_src.dx
                    this.physicsObject.dy = physics_src.dy
                    this.physicsObject.angle = physics_src.angle
                    this.physicsObject.angular_velocity = physics_src.angular_velocity
                }
            })
        }

        this.init = function() {
            this.images_left = image_list.length
            for (var i = 0; i < image_list.length; ++i) {
                var current_i = i.valueOf()
                console.log('copy ' + current_i)
                this.init_image(image_list, current_i)
            }
        }

        this.init()

        this.calculate_state = function() {
            if (this.physicsObject != null) {
                this.physicsObject.calculate_state()
            }
        }

        this.clamp_region = function(remove_on_leave) {
            return this.physicsObject != null && this.physicsObject.clamp_region(remove_on_leave)
        }

        this.render = function() {
            if (this.loops_left > 0 && this.images_left == 0) {
                if (this.physicsObject != null) {
                    this.physicsObject.render()
                }
                this.image_index += 1
                if (this.image_index >= this.images.length) {
                    this.image_index = 0
                    this.loops_left -= 1
                }
                if (this.physicsObject != null) {
                    this.physicsObject.update_image(this.images[this.image_index])
                }
            }
        }


    }
}

function make_explosion_animator(canvas, scale, loops, physics_src) {
    var IMAGE_LIST = []
    for (var i = 1; i <= 17; ++i){
        IMAGE_LIST.push('../img/explosion/' + i.valueOf() + '.png')
    }
    return new PhysicsShortAnimation(canvas, IMAGE_LIST, scale, loops, physics_src)
}

function make_quantum_explosion_animator(canvas, scale, loops, physics_src) {
    var IMAGE_LIST = []
    for (var i = 1; i <= 9; ++i){
        IMAGE_LIST.push('../img/explosion/in' + i.valueOf() + '.png')
    }
    for (var i = 8; i >= 1; --i){
        IMAGE_LIST.push('../img/explosion/in' + i.valueOf() + '.png')
    }
    return new PhysicsShortAnimation(canvas, IMAGE_LIST, scale, loops, physics_src)
}

const max_velocity_component = 25

var mouse = {
    x: 0,
    y: 0
}

var mouse_moved = function(e) {
    var bounding_box = main_canvas.getBoundingClientRect()
    mouse.x = e.pageX - bounding_box.left
    mouse.y = e.pageY - bounding_box.top
}

document.addEventListener('mousemove', mouse_moved)

var canvas_reset = function() {
    canvas_context.clearRect(0, 0, main_canvas.width, main_canvas.height)
}

var render_velocity_indicator = function(canvas, object, max_magnitude, keys) {
    const INDICATOR_WIDTH = 400
    const INDICATOR_HEIGHT = 200

    const SIZE = 150
    const X_OFFSET = canvas.width / 2 - INDICATOR_WIDTH / 2
    const Y_OFFSET = canvas.height - INDICATOR_WIDTH / 2
    const X_CENTRE = X_OFFSET + SIZE / 2
    const Y_CENTRE = Y_OFFSET + SIZE / 2
    const ctx = canvas.getContext('2d')

    // Axis
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(X_OFFSET, Y_OFFSET + SIZE / 2)
    ctx.lineTo(X_OFFSET + SIZE, Y_OFFSET + SIZE / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(X_OFFSET + SIZE / 2, Y_OFFSET)
    ctx.lineTo(X_OFFSET + SIZE / 2, Y_OFFSET + SIZE)
    ctx.stroke()

    // Velocity indicator
    const Y_DELTA = (object.dy / max_magnitude) * SIZE / 2
    const X_DELTA = (object.dx / max_magnitude) * SIZE / 2
    const X_TIP = X_CENTRE + X_DELTA
    const Y_TIP = Y_CENTRE + Y_DELTA
    ctx.beginPath()
    ctx.lineWidth = 6
    ctx.strokeStyle = 'blue'
    ctx.moveTo(X_CENTRE, Y_CENTRE)
    ctx.lineTo(X_TIP, Y_TIP)
    ctx.stroke()

    // Rotation indicator
    ctx.beginPath()
    ctx.lineWidth = 6
    ctx.strokeStyle = 'grey'
    ctx.moveTo(X_TIP, Y_TIP)
    const ANGULAR_SCALE = Math.max(6, 20 * (Math.abs(object.angular_velocity) / object.MAX_ANGULAR_MAGNITUDE))
    ctx.lineTo(X_TIP - ANGULAR_SCALE * Math.cos(object.angle + Math.PI / 2), Y_TIP - ANGULAR_SCALE * Math.sin(object.angle + Math.PI / 2))
    ctx.stroke()

    ctx.font = '15px arial'
    ctx.fillStyle = 'white'
    ctx.fillText('v: ' + object.velocity.toFixed(2)
        + ', dx: ' + object.dx.toFixed(2)
        + ', dy: ' + object.dy.toFixed(2)
        + ', \u03b8: ' + object.angle.toFixed(2)
        + ', \u03C9: ' + (object.angular_velocity * (1000 / 16)).toFixed(2)
        , X_OFFSET, Y_OFFSET - 30)

    var control_text = ''

    if (controls.fuel == 0.0) {
        control_text += 'OUT OF FUEL'
    }
    ctx.fillText(control_text, X_OFFSET, Y_OFFSET - 10)

    // throttle
    ctx.strokeStyle = 'blue'
    ctx.beginPath()
    ctx.moveTo(X_OFFSET + SIZE + 25, Y_OFFSET + SIZE)
    ctx.lineTo(X_OFFSET + SIZE + 25, Y_OFFSET + SIZE - (SIZE * controls.throttle))
    ctx.stroke()

    // fuel
    ctx.strokeStyle = 'yellow'
    ctx.beginPath()
    ctx.moveTo(X_OFFSET + SIZE + 35, Y_OFFSET + SIZE)
    ctx.lineTo(X_OFFSET + SIZE + 35, Y_OFFSET + SIZE - (SIZE * (controls.fuel / controls.max_fuel)))
    ctx.stroke()

    ctx.font = 'bold 13px arial'
    ctx.fillText('Tesla Stock: $' + controls.score.toFixed(2), X_OFFSET + SIZE + 45, Y_OFFSET + 15)
    ctx.fillText('Performance Benefit: ' + ((calculate_performance_modifier(1500, controls.score, starship) * 100) - 100)
        .toFixed(2) + '%', X_OFFSET + SIZE + 45, Y_OFFSET + 30)
    
    ctx.font = 'bold 12px arial'
    if (controls.jump_ready) {
        ctx.fillText('JUMP READY', X_OFFSET + SIZE + 45, Y_OFFSET + SIZE - 75)
    } else {
        var seconds_remaining = (2000 - Math.abs(new Date().getTime() - controls.jump_time_fired)) / 1000
        if (seconds_remaining > 0) {
            ctx.fillText('COOLDOWN: ' + seconds_remaining.toFixed(2), X_OFFSET + SIZE + 45, Y_OFFSET + SIZE - 75)
        } else {
            ctx.fillText((5 - controls.ammo) + ' MISSILES NEEDED', X_OFFSET + SIZE + 45, Y_OFFSET + SIZE - 75)
        }
    }

    ctx.font = '12px arial'
    ctx.fillText('Missiles: ' + controls.ammo, X_OFFSET + SIZE + 45, Y_OFFSET + SIZE - 60)
    ctx.fillText('Mass: ' + (starship.mass + starship.extra_mass).toFixed(2), X_OFFSET + SIZE + 45, Y_OFFSET + SIZE - 45)
    ctx.fillText('Fuel: ' + controls.fuel.toFixed(2), X_OFFSET + SIZE + 45, Y_OFFSET + SIZE - 30)
    ctx.fillText('Burn Rate: ' + (controls.fuel_burn_rate * (1000 / 16)).toFixed(2) + '/s', X_OFFSET + SIZE + 45, Y_OFFSET + SIZE - 15)
    ctx.fillText('Throttle: ' + (controls.throttle * 100).toFixed(2) + '%', X_OFFSET + SIZE + 45, Y_OFFSET + SIZE)

    if (controls.show_controls) {
        var control_text = [
            '\u2191: Main thrust',
            '\u2190: Increase left rotation',
            '\u2192: Increase right rotation',
            'WASD: Translate',
            'Shift: Increase throttle',
            'Control: Decrease throttle',
            'F: Fire Model 3',
            'J: Emergency Jump',
            'H: Toggle help',
            '',
            'Performance benefit affects:',
            '- Main thrust fuel burn rate',
            '- Model 3 missile regeneration',
            '- Model 3 missile speed',
            '',
            'Performance benefit is affected by:',
            '- Tesla stock price',
            '- Starship velocity',
            '- Starship angular velocity'
        ]
        for (var i = 0; i < control_text.length; ++i) {
            ctx.font = '11.5px arial'
            ctx.fillText(control_text[i], 20, 20 + 15 * i)
        }
    }
}

var render = function() {
    canvas_reset()
}

var starship = new PhysicsObject(1000, '../img/starship.png', main_canvas, 0.1)

var controls = {
    up: false,
    left: false,
    right: false,
    down: false,
    shift: false,
    control: false,
    space: false,
    f: false,
    w: false,
    a: false,
    s: false,
    d: false,
    j: false,
    throttle: 1,
    fuel: 100,
    max_fuel: 100,
    fuel_burn_rate: 1,
    show_controls: true,
    show_controls_debounce: false,
    ammo: 10,
    ammo_regen_start_time: 0,
    score: 1500,
    jump_time_fired: 0,
    jump_ready: false
}

document.onkeydown = function(e) {
    if (e.keyCode == 38) {
        controls.up = true
    } else if (e.keyCode == 37) {
        controls.left = true
    } else if (e.keyCode == 39) {
        controls.right = true
    } else if (e.keyCode == 40) {
        controls.down = true
    } else if (e.keyCode == 17) {
        controls.control = true
    } else if (e.keyCode == 32) {
        controls.space = true
    } else if (e.keyCode == 70) {
        controls.f = true
    } else if (e.keyCode == 16) {
        controls.shift = true
    } else if (e.keyCode == 87) {
        controls.w = true;
    } else if (e.keyCode == 65) {
        controls.a = true;
    } else if (e.keyCode == 83) {
        controls.s = true;
    } else if (e.keyCode == 68) {
        controls.d = true;
    } else if (e.keyCode == 72) {
        if (!controls.show_controls_debounce) {
            controls.show_controls_debounce = true
        }
    } else if (e.keyCode == 74) {
        controls.j = true;
    }
}
document.onkeyup = function(e) {
    if (e.keyCode == 38) {
        controls.up = false
    } else if (e.keyCode == 37) {
        controls.left = false
    } else if (e.keyCode == 39) {
        controls.right = false
    } else if (e.keyCode == 40) {
        controls.down = false
    } else if (e.keyCode == 17) {
        controls.control = false
    } else if (e.keyCode == 32) {
        controls.space = false
    } else if (e.keyCode == 70) {
        controls.f = false
    } else if (e.keyCode == 16) {
        controls.shift = false
    } else if (e.keyCode == 87) {
        controls.w = false;
    } else if (e.keyCode == 65) {
        controls.a = false;
    } else if (e.keyCode == 83) {
        controls.s = false;
    } else if (e.keyCode == 68) {
        controls.d = false;
    } else if (e.keyCode == 72) {
        controls.show_controls_debounce = false
        controls.show_controls = !controls.show_controls
    } else if (e.keyCode == 74) {
        controls.j = false
    }
}

var cars = []
var last_car_launched = 0

var asteroid_data = {
    entities: [],
    image_srcs: ['../img/target/asteroid_1.png', '../img/target/asteroid_2.png', '../img/target/asteroid_3.png'
        , '../img/target/asteroid_4.png', '../img/target/bezos_1.png', '../img/target/new_glenn.png'
        , '../img/target/new_shepard.png'
    ],
    max_count: 20,
    last_launched: 0,
    min_launch_interval: 750,
    min_launch_interval_range: 1000
}

function pythagorean_c(x, y) {
    return Math.sqrt(x *x + y * y)
}

function calculate_performance_modifier(base, current, starship) {
    score = clamp(current / base, 0.0, 1.1)
    score += 0.1 * (starship.velocity / pythagorean_c(starship.MAX_VELOCITY_MAGNITUDE, starship.MAX_VELOCITY_MAGNITUDE))
    score += 0.2 * (Math.abs(starship.angular_velocity) / starship.MAX_ANGULAR_MAGNITUDE)
    return score
}

function random_sign() {
    return ((Math.random() < 0.5) ? 1 : -1)
}


function spawn_asteroid(canvas, starship) {
    var done = false
    const max_velocity_component = 5

    while (!done) {
        const random_x = canvas.width * Math.random()
        const random_y = canvas.height * Math.random()
        const random_dx =  random_sign() * (Math.random() * max_velocity_component)
        const random_dy = random_sign() * (Math.random() * max_velocity_component)
        const random_rotational_velocity = random_sign() * (Math.random() * 0.01)
        const random_rotation = random_sign() * Math.random() * 2 * Math.PI
        const random_mass = clamp(Math.random() * 5000, 100, 5000)
        const random_img_src = asteroid_data.image_srcs[Math.floor(Math.random() * asteroid_data.image_srcs.length)]

        var asteroid = new PhysicsObject(random_mass, random_img_src, canvas, 0.20)
        asteroid.x = random_x
        asteroid.y = random_y
        asteroid.dx = random_dx
        asteroid.dy = random_dy
        asteroid.angular_velocity = random_rotational_velocity
        asteroid.angle = random_rotation

        if (starship.distance_to(asteroid) >= 250) {
            done = true
        } else {
            console.log('retry asteroid spawn')
        }
    }
    return asteroid
}

class AutopilotData {
    constructor(physicsObject) {
        this.physicsObject = physicsObject
        this.target_angle = null

        this.set_target_angle_offset = function(angular_offset_magnitude) {
            var target_angle_left = this.physicsObject.angle - angular_offset_magnitude
            var target_angle_right = this.physicsObject.angle + angular_offset_magnitude

            this.target_angle = (Math.abs(target_angle_left - this.physicsObject.angle) 
                <= Math.abs(target_angle_right - this.physicsObject.angle))
                ? target_angle_left : target_angle_right
        }

        this.is_target_angle_set = function() {
            return this.target_angle != null
        }

        this.clear_target_angle = function() {
            this.target_angle = null
        }

        this.move_to_target_angle = function() {
            const CURRENT_ANGLE = this.physicsObject.angle
            const ERROR = CURRENT_ANGLE - this.target_angle
            this.physicsObject.angular_velocity += -1 * 0.0025 * (ERROR / Math.PI)
            if (ERROR <= 0.1995) {
                this.physicsObject.angular_velocity *= 0.625
            }
        }
    }
}

var autopilot = new AutopilotData(starship)

var physics_entities = {
    vehicles: [],
    projectiles: [],
    asteroids: [],
    explosions: []
}

physics_entities.vehicles.push(starship)

var loop_func = function() {
    canvas_reset()

    if (controls.shift) {
        controls.throttle += 0.02
    } else if (controls.control) {
        controls.throttle -= 0.02
    }

    controls.fuel_burn_rate = 0
    controls.throttle = clamp(controls.throttle, 0.40, 1.0)

    if (controls.left) {
        starship.angular_velocity -= 0.0015
    } else if (controls.right) {
        starship.angular_velocity += 0.0015
    }

    const MAIN_THRUST = 100
    if (controls.fuel > 0) {
        if (controls.up) {
            controls.fuel_burn_rate += 0.035 * controls.throttle
            starship.apply_force(controls.throttle * MAIN_THRUST)
        }

        var translation_count = 0
        if (controls.s) {
            starship.translate_rear(15)
            translation_count += 1
        }
        if (controls.w) {
            starship.translate_forward(15)
            translation_count += 1
        }
        if (controls.a) {
            starship.translate_left(15)
            translation_count += 1
        }
        if (controls.d) {
            starship.translate_right(15)
            translation_count += 1
        }
        if (translation_count > 0) {
            controls.fuel_burn_rate += translation_count * 0.005
        }
    }

    controls.fuel_burn_rate *= (1.0 / calculate_performance_modifier(1500, controls.score, starship))
    controls.fuel -= controls.fuel_burn_rate
    controls.fuel = clamp(controls.fuel, 0.0, controls.max_fuel)

    starship.extra_mass = controls.fuel * 5
    starship.calculate_state()
    starship.clamp_region()

    var current_time = new Date().getTime()

    var ammo_regen_time = 1000 * (1.0 / calculate_performance_modifier(1500, controls.score, starship))
    if (current_time - controls.ammo_regen_start_time >= ammo_regen_time) {
        controls.ammo += 1
        controls.ammo_regen_start_time = current_time
    }
    controls.ammo = clamp(controls.ammo, 0, 10)

    if (controls.f) {
        if (controls.ammo > 0) {

            if (current_time - last_car_launched >= 250) {
                controls.ammo -= 1

                last_car_launched = current_time
                var new_car = new PhysicsObject(5, '../img/tesla.png', main_canvas, 0.05)
                new_car.MAX_VELOCITY_MAGNITUDE = 50
                new_car.angle = starship.angle
                const LAUNCH_FORCE = 100 * calculate_performance_modifier(1500, controls.score, starship)
                new_car.angular_velocity = starship.angular_velocity / 2
                new_car.x = starship.x + 50 * Math.sin(new_car.angle)
                new_car.y = starship.y - 50 * Math.cos(new_car.angle)
                new_car.dx = starship.dx
                new_car.dy = starship.dy
                new_car.translate_forward(LAUNCH_FORCE)
                starship.translate_rear(LAUNCH_FORCE)
                physics_entities.projectiles.push(new_car)
            }
        }
    }

    controls.jump_ready = (new Date().getTime() - controls.jump_time_fired >= 2000) && (controls.ammo >= 5)

    if (controls.j && controls.jump_ready) {
        controls.jump_time_fired = new Date().getTime()
        starship.x += 300 * Math.sin(starship.angle)
        starship.y -= 300 * Math.cos(starship.angle)
        starship.translate_forward(2500)
        controls.ammo -= 5
        controls.fuel -= 10
        controls.fuel = clamp(controls.fuel, 0.0, controls.max_fuel)

        var quantum_explosion_scale = 0.4 + (random_sign() * Math.random() * 0.1)
        var quantum_explosion = make_quantum_explosion_animator(main_canvas, quantum_explosion_scale, 1, starship)
        physics_entities.explosions.push(quantum_explosion)
    }

    if (new Date().getTime() - asteroid_data.last_launched 
        >= asteroid_data.min_launch_interval + Math.random() * asteroid_data.min_launch_interval_range) {
        if (physics_entities.asteroids.length < asteroid_data.max_count) {
            var new_asteroid = spawn_asteroid(main_canvas, starship)
            physics_entities.asteroids.push(new_asteroid)
            var quantum_explosion_scale = 0.5 + (random_sign() * Math.random() * 0.1)
            var quantum_explosion = make_quantum_explosion_animator(main_canvas, quantum_explosion_scale, 1, new_asteroid)
            physics_entities.explosions.push(quantum_explosion)
        }
        asteroid_data.last_launched = new Date().getTime()
    }

    var deletion_queue = {
        projectiles: [],
        asteroids: [],
        vehicles: [],
        explosions: []
    }

    physics_entities.explosions.forEach(function(explosion, index,_) {
        explosion.calculate_state()
        if (explosion.clamp_region() || explosion.loops_left <= 0) {
            deletion_queue.explosions.push(index)
        }
    })

    physics_entities.projectiles.forEach(function(projectile, index, _) {
        projectile.calculate_state()
        if (projectile.clamp_region(true)) {
            deletion_queue.projectiles.push(index)
        }
    })

    physics_entities.asteroids.forEach(function(asteroid, index, _) {
        asteroid.calculate_state()
        if (asteroid.clamp_region(true)) {
            deletion_queue.asteroids.push(index)
        }
    })
    physics_entities.vehicles.forEach(function(vehicle, _, _) {
        vehicle.calculate_state()
    })

    for (var i = 0; i < physics_entities.projectiles.length; ++i) {
        for (var j = 0; j < physics_entities.asteroids.length; ++j) {
            if (physics_entities.projectiles[i].has_collided(physics_entities.asteroids[j])) {
                deletion_queue.asteroids.push(j)
                deletion_queue.projectiles.push(i)
                controls.fuel += 2.5
                controls.fuel = clamp(controls.fuel, 0.0, controls.max_fuel)
                
                if (!physics_entities.asteroids[j].image.src.includes('mars')) {
                    controls.score += 10
                } else {
                    controls.score -= 50
                }

                var explosion_scale = 1.5 + (random_sign() * Math.random() * 0.25)
                var explosion = make_explosion_animator(main_canvas, explosion_scale, 1, physics_entities.asteroids[j])
                physics_entities.explosions.push(explosion)
            } 
        }
    }

    for (var i = 0; i < physics_entities.vehicles.length; ++i) {
        for (var j = 0; j < physics_entities.asteroids.length; ++j) {
            if (physics_entities.vehicles[i].has_collided(physics_entities.asteroids[j])) {
                deletion_queue.asteroids.push(j)

                controls.fuel -= 5
                controls.fuel = clamp(controls.fuel, 0.0, controls.max_fuel)
                starship.angular_velocity += random_sign() * 0.025
                controls.score -= 25
                controls.score = clamp(controls.score, 0, 10000000)
                var explosion = make_explosion_animator(main_canvas, 0.5, 1, starship)
                physics_entities.explosions.push(explosion)

            } 
        }
    }

    deletion_queue.projectiles.forEach(function(index, _, _) {
        physics_entities.projectiles.splice(index, 1)
    })
    deletion_queue.asteroids.forEach(function(index, _, _) {
        physics_entities.asteroids.splice(index, 1)
    })
    deletion_queue.vehicles.forEach(function(index, _, _) {
        physics_entities.vehicles.splice(index, 1)
    })
    deletion_queue.explosions.forEach(function(index, _, _) {
        physics_entities.explosions.splice(index, 1)
    })

    physics_entities.projectiles.forEach(function(projectile, index, _) {
        projectile.render()
    })
    physics_entities.asteroids.forEach(function(asteroid, index, _) {
        asteroid.render()
    })
    physics_entities.vehicles.forEach(function(vehicle, index, _) {
        vehicle.render()
    })
    physics_entities.explosions.forEach(function(explosion, index, _) {
        explosion.render()
    })

    render_velocity_indicator(main_canvas, starship, 10, controls)

    setTimeout(loop_func, 16)
}

console.log('hi')

function wait_for_start() {
    var started = controls.space
    if (started) {
        background_music.play()
        background_music.volume = 0.25
        background_music.loop = true
        loop_func()
    } else {
        canvas_reset()
        canvas_context.fillStyle = 'white'
        canvas_context.font = '50px arial'
        var max_width = main_canvas.width / 3
        canvas_context.fillText('Press SPACE to start', main_canvas.width / 2 - max_width / 2.5, main_canvas.height / 2, max_width)
        canvas_context.strokeText('Press SPACE to start', main_canvas.width / 2 - max_width / 2.5, main_canvas.height / 2, max_width)
        setTimeout(wait_for_start, 16)
    }
}

wait_for_start()
