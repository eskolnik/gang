import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        //  Skip asset loading for now - we don't need any assets yet
    }

    create ()
    {
        //  Go straight to Lobby
        this.scene.start('Lobby');
    }
}
