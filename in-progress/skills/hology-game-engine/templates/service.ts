// Template: a singleton service for shared state / systems / cross-actor communication.
// Copy into src/services/<name>.ts, rename, and inject with `inject(MyService)` from actors/components/services.
// One instance exists per game. Call inject(...) only in constructors / field initializers.
import { Service, World, inject } from '@hology/core/gameplay'
import { Subject } from 'rxjs'

@Service()
class GameState {
  private world = inject(World)

  score = 0

  // Put event emitters on a service so any actor can publish/subscribe (cross-actor communication).
  readonly scoreChanged = new Subject<number>()

  addScore(points: number) {
    this.score += points
    this.scoreChanged.next(this.score)
  }
}

export default GameState

/*
 * If this service is the game's ENTRY POINT, extend GameInstance instead and implement onStart():
 *
 * import { GameInstance, Service, World, inject } from '@hology/core/gameplay'
 *
 * @Service()
 * class Game extends GameInstance {
 *   private world = inject(World)
 *   async onStart() {
 *     // spawn actors, wire up player controller + camera here
 *   }
 * }
 * export default Game
 */
