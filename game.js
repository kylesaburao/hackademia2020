var main_canvas = document.getElementById('main_canvas');
var canvas_context = main_canvas.getContext('2d');

var musk_image = new Image();
musk_image.src = 'img/elon_musk.png'

var starship_image = new Image();
starship_image.src = 'img/starship.png'

var starship_x = 0;

var loop_func = function() {
    canvas_context.clearRect(0, 0, main_canvas.width, main_canvas.height);
    canvas_context.drawImage(starship_image, starship_x, 0);
    canvas_context.drawImage(musk_image, 10, 10, 200, 200);
    starship_x += 1;
    if (starship_x > 100) {
        starship_x = -starship_image.width + 0.5 * starship_image.width;
    }
    setTimeout(loop_func, 30);
};

console.log('hi');
loop_func();