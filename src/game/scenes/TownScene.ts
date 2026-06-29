import Phaser from 'phaser';
import arrivalBackdropUrl from '../../assets/town/arrival-backdrop.png';
import hamletBackdropUrl from '../../assets/town/hamlet-backdrop.png';
import mountainTownBackdropUrl from '../../assets/town/mountain-town-generated-backdrop.png';
import villageBackdropUrl from '../../assets/town/village-backdrop.png';
import type { BuildingId } from '../../simulation';
import type { TownHotspotId, TownHotspotSelection, TownHotspotSnapshot } from '../../ui/townHotspots';

interface TownBuildingSnapshot {
  id: BuildingId;
  label: string;
  level: number;
  workers: number;
  blocked: boolean;
}

export interface TownSnapshot {
  townBackdropKey: string;
  inputLocked: boolean;
  money: number;
  food: number;
  globalProductionMultiplier: number;
  selectedHotspotId: string | null;
  buildings: TownBuildingSnapshot[];
  hotspots: TownHotspotSnapshot[];
}

interface HotspotVisual {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle;
  halo: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  detail: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Arc;
  selection: Phaser.GameObjects.Rectangle;
  hotspot: TownHotspotSnapshot;
}

const TOWN_BACKDROP_BY_STAGE: Record<string, { key: string; url: string }> = {
  arrival: { key: 'town-backdrop-arrival', url: arrivalBackdropUrl },
  hamlet: { key: 'town-backdrop-hamlet', url: hamletBackdropUrl },
  village: { key: 'town-backdrop-village', url: villageBackdropUrl },
  mountain_town: { key: 'town-backdrop-mountain-town', url: mountainTownBackdropUrl },
};

const DEFAULT_TOWN_BACKDROP_KEY = TOWN_BACKDROP_BY_STAGE.arrival.key;

export class TownScene extends Phaser.Scene {
  private backdrop?: Phaser.GameObjects.Image;
  private currentBackdropKey = DEFAULT_TOWN_BACKDROP_KEY;
  private inputLocked = false;
  private visuals = new Map<TownHotspotId, HotspotVisual>();
  private smoke: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('TownScene');
  }

  preload() {
    for (const backdrop of Object.values(TOWN_BACKDROP_BY_STAGE)) {
      this.load.image(backdrop.key, backdrop.url);
    }
  }

  create() {
    this.drawBackdrop();
    this.createSceneChrome();

    this.game.events.on('town:update', this.updateTown, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutTown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('town:update', this.updateTown, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutTown, this);
    });
  }

  update(_time: number, delta: number) {
    const height = this.scale.height;

    this.smoke.forEach((particle, index) => {
      particle.y -= delta * (0.011 + index * 0.0015);
      particle.x += Math.sin((particle.y + index * 20) * 0.03) * 0.18;
      particle.alpha = Phaser.Math.Clamp((particle.y - height * 0.28) / 180, 0.12, 0.42);

      if (particle.y < height * 0.3) {
        particle.y = height * 0.62 + index * 8;
      }
    });
  }

  private drawBackdrop() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x273a33);
    this.backdrop = this.add.image(width / 2, height / 2, this.currentBackdropKey).setDepth(0);
    this.layoutBackdrop();
  }

  private createSceneChrome() {
    for (let index = 0; index < 7; index += 1) {
      this.smoke.push(this.add.circle(this.scale.width * 0.34 + index * 5, this.scale.height * 0.62 + index * 8, 7, 0xd6d2c8, 0.32));
    }
  }

  private updateTown(snapshot: TownSnapshot) {
    this.inputLocked = snapshot.inputLocked;
    this.updateBackdrop(snapshot.townBackdropKey);
    const hotspotIds = new Set<TownHotspotId>(snapshot.hotspots.map((hotspot) => hotspot.id));

    for (const [id, visual] of this.visuals) {
      if (!hotspotIds.has(id)) {
        visual.container.destroy(true);
        this.visuals.delete(id);
      }
    }

    for (const hotspot of snapshot.hotspots) {
      const visual = this.visuals.get(hotspot.id) ?? this.createHotspotVisual(hotspot);
      this.visuals.set(hotspot.id, visual);

      const width = this.getHotspotWidth(hotspot);
      const height = this.getHotspotHeight(hotspot);
      const position = this.getHotspotPosition(hotspot);
      const selected = hotspot.selected;

      visual.hotspot = hotspot;
      visual.container.setData('hotspot', hotspot);
      visual.container.setPosition(position.x, position.y);
      visual.body.setDisplaySize(width, height);
      visual.halo.setDisplaySize(width + 18, height + 18);
      visual.selection.setDisplaySize(width + 8, height + 8);
      visual.label.setText(hotspot.label);
      visual.detail.setText(hotspot.detail);
      visual.status.setFillStyle(hotspot.blocked ? 0xd8903f : selected ? 0xe2b34e : 0x73c66d);
      visual.body.setAlpha(selected ? 0.96 : hotspot.blocked ? 0.58 : 0.82);
      visual.halo.setAlpha(selected ? 0.18 : 0.08);
      visual.selection.setAlpha(selected ? 1 : 0);
      visual.label.setAlpha(hotspot.blocked ? 0.82 : 1);
      visual.detail.setAlpha(hotspot.blocked ? 0.7 : 0.86);
      visual.selection.setStrokeStyle(selected ? 2 : 0, 0xf8f3df, selected ? 0.95 : 0);
      visual.body.setStrokeStyle(selected ? 2 : 1, hotspot.blocked ? 0xda9a61 : 0xf8f3df, selected ? 0.9 : 0.45);
      visual.body.setFillStyle(selected ? 0x2a453e : hotspot.blocked ? 0x6b4a28 : 0x17211f, hotspot.blocked ? 0.74 : 0.68);
    }

    this.layoutTown();
  }

  private updateBackdrop(stageKey: string) {
    const nextBackdropKey = TOWN_BACKDROP_BY_STAGE[stageKey]?.key ?? DEFAULT_TOWN_BACKDROP_KEY;
    if (!this.backdrop || this.currentBackdropKey === nextBackdropKey) {
      return;
    }

    this.currentBackdropKey = nextBackdropKey;
    this.backdrop.setTexture(nextBackdropKey);
    this.layoutBackdrop();
  }

  private createHotspotVisual(hotspot: TownHotspotSnapshot) {
    const position = this.getHotspotPosition(hotspot);
    const width = this.getHotspotWidth(hotspot);
    const height = this.getHotspotHeight(hotspot);

    const halo = this.add.rectangle(0, 0, width + 18, height + 18, 0xf8f3df, 0.08).setDepth(2);
    const selection = this.add.rectangle(0, 0, width + 8, height + 8, 0xf8f3df, 0).setDepth(3);
    const body = this.add.rectangle(0, 0, width, height, 0x17211f, 0.68).setDepth(4);
    const label = this.add
      .text(0, -8, hotspot.label, {
        align: 'center',
        color: '#fff8e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: hotspot.kind === 'building' ? '13px' : '12px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);
    const detail = this.add
      .text(0, 10, hotspot.detail, {
        align: 'center',
        color: '#f0ead9',
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
      })
      .setOrigin(0.5)
      .setDepth(5);
    const status = this.add.circle(width / 2 - 12, -height / 2 + 10, 5, 0x73c66d).setDepth(6);
    const container = this.add.container(position.x, position.y, [halo, selection, body, label, detail, status]).setDepth(4);
    container.setData('hotspot', hotspot);

    const emitHotspotSelect = () => {
      if (this.inputLocked) {
        return;
      }

      this.game.events.emit(
        'town:hotspot-select',
        container.getData('hotspot') as TownHotspotSelection,
      );
    };

    body
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_UP, emitHotspotSelect)
      .on(Phaser.Input.Events.POINTER_OVER, () => body.setStrokeStyle(2, 0xf8f3df, 0.9))
      .on(Phaser.Input.Events.POINTER_OUT, () => body.setStrokeStyle(1, hotspot.blocked ? 0xda9a61 : 0xf8f3df, 0.45));
    label.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_UP, emitHotspotSelect);
    detail.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_UP, emitHotspotSelect);

    return {
      container,
      body,
      halo,
      label,
      detail,
      status,
      selection,
      hotspot,
    };
  }

  private layoutTown() {
    const { width, height } = this.scale;

    this.layoutBackdrop();

    this.smoke.forEach((particle, index) => {
      particle.setPosition(width * 0.29 + index * 5, height * 0.62 + index * 8);
    });

    for (const [id, visual] of this.visuals) {
      const position = this.getHotspotPosition(visual.hotspot);
      visual.container.setPosition(position.x, position.y);
      visual.status.setPosition(this.getHotspotWidth(visual.hotspot) / 2 - 12, -this.getHotspotHeight(visual.hotspot) / 2 + 10);
      visual.selection.setPosition(0, 0);
      visual.halo.setPosition(0, 0);
      visual.body.setPosition(0, 0);
      visual.label.setPosition(0, -8);
      visual.detail.setPosition(0, 10);
    }
  }

  private layoutBackdrop() {
    const { width, height } = this.scale;

    if (!this.backdrop) {
      return;
    }

    const scale = Math.min(width / this.backdrop.width, height / this.backdrop.height);
    this.backdrop.setPosition(width / 2, height / 2).setScale(scale);
  }

  private getHotspotPosition(hotspot: TownHotspotSnapshot) {
    const { width, height } = this.scale;
    const backdropWidth = this.backdrop?.displayWidth ?? width;
    const backdropHeight = this.backdrop?.displayHeight ?? height;
    const left = width / 2 - backdropWidth / 2;
    const top = height / 2 - backdropHeight / 2;

    return {
      x: left + hotspot.x * backdropWidth,
      y: top + hotspot.y * backdropHeight,
    };
  }

  private getHotspotWidth(hotspot: TownHotspotSnapshot) {
    return Math.max(100, (this.backdrop?.displayWidth ?? this.scale.width) * hotspot.width);
  }

  private getHotspotHeight(hotspot: TownHotspotSnapshot) {
    return Math.max(52, (this.backdrop?.displayHeight ?? this.scale.height) * hotspot.height);
  }
}
