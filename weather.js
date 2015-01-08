/*
 * Weather Component
 * Zetaphor
 */
ig.module(
        'plugins.weather'
)
.requires(
        'impact.impact',
        'impact.entity',
        'impact.entity-pool'
)
.defines(function(){
ig.Weather = ig.Class.extend({
    lightning_rate: 0.005, // How often lightning strikes
    lightningRateTime: 10, // How often to attempt a new strike
    lightningFadeRate: 0.5, // How quickly the lightning fades
    lightningActive: false,
    lightningFadeTimer: new ig.Timer(),
    lightningTimer: new ig.Timer(),
    nextParticle: new ig.Timer(),

    init: function() {
        ig.global.weather_condition = {
            rain     : false,
            snow     : false,
            lightning: false,
            particles_curr: 0,
            particles_max: 200
        };

        this.lightningTimer.set(this.lightningRateTime);
        this.lightningFadeTimer.set(this.lightningFadeRate);
        this.lightningFadeTimer.disabled = true;

        this.nextParticle = new ig.Timer();
    },

    draw: function() {
        // Don't draw lightning if the game is paused
        if (ig.game.paused) return;

        // Draw the lightning
        if(ig.global.weather_condition.lightning) {
            // Only show lightening when previous lightening has faded
            if (!this.lightningActive) {
                if(this.lightningTimer.delta() >= -this.lightningRateTime) {
                    if(Math.random() < this.lightning_rate) {
                        // Trigger lightning
                        this.lightningActive = true;
                        this.lightningFadeTimer.disabled = false;
                        this.lightningFadeTimer.reset();
                    }
                }
            }

            if (!this.lightningFadeTimer.disabled) {
                if (this.lightningFadeTimer.delta() <= 0) {
                    var opacity = Math.abs(this.lightningFadeTimer.delta());
                    ig.system.context.fillStyle = 'rgba(255, 255, 255, ' + opacity;
                    ig.system.context.fillRect(0, 0, ig.system.realWidth, ig.system.realHeight);
                } else if (this.lightningFadeTimer.delta() > 0) {
                    this.lightningFadeTimer.disabled = true;
                    this.lightningActive = false;
                }
            }
        }
    },

    update: function() {
        // Generate particles based on weather condition
        if(ig.global.weather_condition.rain) {
            // Rain
            if(ig.global.weather_condition.particles_curr < ig.global.weather_condition.particles_max && this.nextParticle.delta() >= 0) {
                ig.global.weather_condition.particles_curr++;
                this.nextParticle.set(1 / (ig.system.height + 1));
                ig.game.spawnEntity(
                    EntityRain,
                    Math.random() * (ig.game.screen.x + ig.system.width - ig.game.screen.x) + ig.game.screen.x,
                    ig.game.screen.y,
                    {weight: Math.random() + 0.5} // Randomize raindrop weight (range: 0.5 - 1.5)
                );
            } else if(ig.global.weather_condition.particles_curr >= ig.global.weather_condition.particles_max) {
                this.nextParticle.set(0);
            }
        } else {
            if(ig.global.weather_condition.particles_curr > 0 && this.nextParticle.delta() >= 0) {
                var r = ig.game.getEntitiesByType(EntityRain)[0];
                if(typeof r !== 'undefined') {
                    r.kill();
                    ig.global.weather_condition.particles_curr--;

                    this.nextParticle.set(2 / (ig.global.weather_condition.particles_curr + 1));
                }
            }
        }

        if(ig.global.weather_condition.snow) {
            // Snow
            if(ig.global.weather_condition.particles_curr < ig.global.weather_condition.particles_max && this.nextParticle.delta() >= 0) {
                ig.global.weather_condition.particles_curr++;
                this.nextParticle.set(1 / (ig.global.weather_condition.particles_max - ig.global.weather_condition.particles_curr + 1));
                ig.game.spawnEntity(
                    EntitySnow,
                    Math.random() * (ig.game.screen.x + ig.system.width - ig.game.screen.x) + ig.game.screen.x,
                    ig.game.screen.y,
                    {radius: Math.random() * 0.5 + 1} // Randomize snow particle size (range: 1.0 - 1.5)
                );
            } else if(ig.global.weather_condition.particles_curr >= ig.global.weather_condition.particles_max) {
                this.nextParticle.set(0);
            }
        } else {
            if(ig.global.weather_condition.particles_curr > 0 && this.nextParticle.delta() >= 0) {
                var s = ig.game.getEntitiesByType(EntitySnow)[0];
                if(typeof s !== 'undefined') {
                    s.kill();
                    ig.global.weather_condition.particles_curr--;

                    this.nextParticle.set(2 / (ig.global.weather_condition.particles_curr + 1));
                }
            }
        }
    } // End Update
});

//#########################################################################
// Particles

/**
 *  Rain particle
 *  @extends ig.Entity
 */
var EntityRain = ig.Entity.extend({
    vel: {x: 20, y: 400},
    maxVel: {x: 100, y: 400},

    weight: 1,    // Raindrop weight

    init: function(x, y, settings) {
        this.parent(x, y, settings);
        ig.EntityPool.enableFor(EntityRain);

        // Randomize raindrop lifetime
        this.lifetime = ig.system.height / this.vel.y;
        this.lifetimeTimer = new ig.Timer(Math.abs(Math.random() * this.lifetime * 1.5 - this.lifetime) + this.lifetime / 2); // Range: 0.5 - lifetime (skewed towards lifetime)

        // Randomize initial velocity
        this.vel.x *= Math.random() + 0.5; // Range: 0.5 - 1.5
        this.vel.y *= Math.random() + 1;   // Range: 1.0 - 2.0 (rain should not "fall" upwards...)

        this.weight = Math.abs(this.weight);
    },

    update: function() {
        this.parent();

        // Handle entity moving out of screen bounds
        // Wraparound to opposite side of screen
        if(this.pos.y > ig.game.screen.y + ig.system.height || this.lifetimeTimer.delta() >= 0) {
           this.pos.y = ig.game.screen.y;
           this.lifetimeTimer.set(Math.random() * this.lifetime + this.lifetime / 2);
        } else if(this.pos.x > ig.game.screen.x + ig.system.width) {
            this.pos.x = ig.game.screen.x;
        } else if(this.pos.x < ig.game.screen.x) {
            this.pos.x = ig.game.screen.x + ig.system.width;
        }
    },

    draw: function() {
        // Draw rain
        ig.system.context.strokeStyle = 'rgba(200, 200, 200, 0.6)';
        ig.system.context.lineWidth = this.weight;
        ig.system.context.beginPath();
            ig.system.context.moveTo(this.pos.x, this.pos.y);
            ig.system.context.lineTo(this.pos.x + this.vel.x * 0.05, this.pos.y + this.vel.y * 0.02);
        ig.system.context.closePath();
        ig.system.context.stroke();
    },

    handleMovementTrace: function() {
        this.pos.x += this.vel.x * ig.system.tick;
        this.pos.y += this.vel.y * ig.system.tick;
    }
}); // End EntityRain

//
/**
 *  Snow particle
 *  @extends {ig.Entity}
 */
var EntitySnow = ig.Entity.extend({
    vel: {x: 60, y: 80},
    maxVel: {x: 100, y: 100},

    radius: 1,    // Particle radius

    init: function(x, y, settings) {
        this.parent(x, y, settings);
        ig.EntityPool.enableFor(EntitySnow);

        // Randomize snow particle lifetime
        this.lifetime = ig.system.height / this.vel.y * 1.5;
        this.lifetimeTimer = new ig.Timer(Math.abs(Math.random() * this.lifetime * 1.5 - this.lifetime) + this.lifetime / 2); // Range: 0.5 - lifetime (skewed towards lifetime)

        // Randomize initial velocity
        this.vel.x *= Math.random() * 2 - 1; // Range: -1.0 - 1.0
        this.vel.y *= Math.abs(Math.random() * 2 - 1); // Range: 0.0 - 1.0 (skewed towards 0) (snow should not "fall" upwards...)

        this.radius = Math.abs(this.radius);
    },

    update: function() {
        this.parent();

        // Handle entity moving out of screen bounds
        // Wraparound to opposite side of screen
        if(this.pos.y > ig.game.screen.y + ig.system.height || this.lifetimeTimer.delta() >= 0) {
           this.pos.y = ig.game.screen.y;
           this.lifetimeTimer.set(Math.random() * this.lifetime + this.lifetime / 2);
        } else if(this.pos.x > ig.game.screen.x + ig.system.width) {
            this.pos.x = ig.game.screen.x;
        } else if(this.pos.x < ig.game.screen.x) {
            this.pos.x = ig.game.screen.x + ig.system.width;
        }
    },

    draw: function() {
        // Draw snow
        ig.system.context.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ig.system.context.beginPath();
            ig.system.context.arc(
                this.pos.x,
                this.pos.y,
                this.radius,
                0,
                2 * Math.PI
            );
        ig.system.context.closePath();
        ig.system.context.fill();
    },

    handleMovementTrace: function() {
        this.pos.x += this.vel.x * ig.system.tick;
        this.pos.y += this.vel.y * ig.system.tick;
    }
}); // End EntitySnow

// End particles
//#########################################################################
});