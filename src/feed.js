/*global define:false */

/*
 * This is the object we export as 'Feed' when everything is bundled up.
 */

define([ 'feed/session', 'feed/log', 'feed/player-view', 'feed/player', 'feed/speaker' ], function(Session, log, PlayerView, Player, speaker) {

  return {
    Session: Session,
    Player: Player,
    PlayerView: PlayerView,
    log: log,
    getSpeaker: speaker
  };

});
