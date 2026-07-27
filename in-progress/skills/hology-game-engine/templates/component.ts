// Template: a reusable ActorComponent encapsulating one aspect of an actor's behaviour.
// Copy into src/components/<name>-component.ts, rename, and re-export from src/components/index.ts.
// Attach to an actor with: `health = attach(HealthComponent)` (see templates/actor.ts).
import { ActorComponent, Component, Parameter } from '@hology/core/gameplay'

// Options: inEditor (also run in editor, visual feedback only), editorOnly (never run in the game).
@Component()
class HealthComponent extends ActorComponent {
  // Editor-tweakable. Parameters are undefined until onInit — set derived state there, not as a field initializer.
  @Parameter() maxHealth: number = 100

  currentHealth: number = 0

  onInit() {
    this.currentHealth = this.maxHealth
  }

  update(change: number) {
    this.currentHealth = Math.max(0, Math.min(this.maxHealth, this.currentHealth + change))
  }

  get isDead() {
    return this.currentHealth <= 0
  }
}

export default HealthComponent
