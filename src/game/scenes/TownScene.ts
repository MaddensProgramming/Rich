import Phaser from 'phaser';
import arrivalBackdropUrl from '../../assets/town/arrival-backdrop-v2.png';
import berriesGatheringUrl from '../../assets/gathering/berries.png';
import hamletBackdropUrl from '../../assets/town/hamlet-backdrop-v2.png';
import mountainTownBackdropUrl from '../../assets/town/mountain-town-backdrop-v2.png';
import stoneGatheringUrl from '../../assets/gathering/stone.png';
import villageBackdropUrl from '../../assets/town/village-backdrop-v2.png';
import woodGatheringUrl from '../../assets/gathering/wood.png';
import type { BuildingId, ResourceId } from '../../simulation';
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
  gatherables: TownGatherableSnapshot[];
}

export interface TownGatherableSnapshot {
  id: string;
  resourceId: Extract<ResourceId, 'wood' | 'stone' | 'vegetables'>;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  clicksRemaining: number;
  poolRemaining: number;
}

interface HotspotVisual {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle;
  halo: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  detail: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Arc;
  selection: Phaser.GameObjects.Rectangle;
  addWorker: Phaser.GameObjects.Text;
  removeWorker: Phaser.GameObjects.Text;
  hotspot: TownHotspotSnapshot;
}

interface GatherableVisual {
  container: Phaser.GameObjects.Container;
  image: Phaser.GameObjects.Image;
  hitArea: Phaser.GameObjects.Ellipse;
  shadow: Phaser.GameObjects.Ellipse;
  badge: Phaser.GameObjects.Text;
  gatherable: TownGatherableSnapshot;
}

const TOWN_BACKDROP_BY_STAGE: Record<string, { key: string; url: string }> = {
  arrival: { key: 'town-backdrop-arrival', url: arrivalBackdropUrl },
  hamlet: { key: 'town-backdrop-hamlet', url: hamletBackdropUrl },
  village: { key: 'town-backdrop-village', url: villageBackdropUrl },
  mountain_town: { key: 'town-backdrop-mountain-town', url: mountainTownBackdropUrl },
};

const DEFAULT_TOWN_BACKDROP_KEY = TOWN_BACKDROP_BY_STAGE.arrival.key;
const GATHERING_ASSETS: Record<TownGatherableSnapshot['resourceId'], { key: string; url: string }> = {
  wood: { key: 'gathering-wood', url: woodGatheringUrl },
  stone: { key: 'gathering-stone', url: stoneGatheringUrl },
  vegetables: { key: 'gathering-berries', url: berriesGatheringUrl },
};

export class TownScene extends Phaser.Scene {
  private backdrop?: Phaser.GameObjects.Image;
  private currentBackdropKey = DEFAULT_TOWN_BACKDROP_KEY;
  private inputLocked = false;
  private visuals = new Map<TownHotspotId, HotspotVisual>();
  private gatherableVisuals = new Map<string, GatherableVisual>();
  private smoke: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('TownScene');
  }

  preload() {
    for (const backdrop of Object.values(TOWN_BACKDROP_BY_STAGE)) {
      this.load.image(backdrop.key, backdrop.url);
    }

    for (const asset of Object.values(GATHERING_ASSETS)) {
      this.load.image(asset.key, asset.url);
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
      visual.detail.setText(hotspot.kind === 'building' ? `${hotspot.workers ?? 0} workers` : hotspot.detail);
      visual.addWorker.setVisible(hotspot.kind === 'building');
      visual.removeWorker.setVisible(hotspot.kind === 'building');
      visual.addWorker.setAlpha(hotspot.canAddWorker ? 1 : 0.34);
      visual.removeWorker.setAlpha(hotspot.canRemoveWorker ? 1 : 0.34);
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

    this.updateGatherables(snapshot.gatherables);
    this.layoutTown();
  }

  private updateGatherables(gatherables: TownGatherableSnapshot[]) {
    const gatherableIds = new Set(gatherables.map((gatherable) => gatherable.id));

    for (const [id, visual] of this.gatherableVisuals) {
      if (!gatherableIds.has(id)) {
        visual.container.destroy(true);
        this.gatherableVisuals.delete(id);
      }
    }

    for (const gatherable of gatherables) {
      const visual = this.gatherableVisuals.get(gatherable.id) ?? this.createGatherableVisual(gatherable);
      const position = this.getGatherablePosition(gatherable);
      const width = this.getGatherableWidth(gatherable);
      const height = this.getGatherableHeight(gatherable);

      this.gatherableVisuals.set(gatherable.id, visual);
      visual.gatherable = gatherable;
      visual.container.setData('gatherable', gatherable);
      visual.container.setPosition(position.x, position.y);
      visual.image.setDisplaySize(width, height);
      visual.hitArea.setSize(width * 0.82, height * 0.78);
      visual.shadow.setSize(width * 0.7, Math.max(12, height * 0.18));
      visual.shadow.setPosition(0, height * 0.34);
      visual.badge.setText(`${gatherable.clicksRemaining}`);
      visual.badge.setPosition(width * 0.3, -height * 0.33);
      visual.container.setAlpha(gatherable.poolRemaining > 0 ? 1 : 0.35);
    }
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
    const workerButtonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      align: 'center',
      backgroundColor: 'rgba(248, 243, 223, 0.92)',
      color: '#17211f',
      fixedWidth: 20,
      fixedHeight: 20,
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
    };
    const removeWorker = this.add.text(-width / 2 + 17, 10, '-', workerButtonStyle).setOrigin(0.5).setDepth(7);
    const addWorker = this.add.text(width / 2 - 17, 10, '+', workerButtonStyle).setOrigin(0.5).setDepth(7);
    const container = this.add
      .container(position.x, position.y, [halo, selection, body, label, detail, status, removeWorker, addWorker])
      .setDepth(4);
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

    const assignWorker = (delta: number) => {
      if (this.inputLocked) {
        return;
      }

      const current = container.getData('hotspot') as TownHotspotSnapshot;
      const allowed = delta > 0 ? current.canAddWorker : current.canRemoveWorker;
      if (!current.buildingId || !allowed) {
        return;
      }

      this.game.events.emit('town:assign-workers', current.buildingId, (current.workers ?? 0) + delta);
    };

    removeWorker
      .setVisible(hotspot.kind === 'building')
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_UP, () => assignWorker(-1));
    addWorker
      .setVisible(hotspot.kind === 'building')
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_UP, () => assignWorker(1));

    return {
      container,
      body,
      halo,
      label,
      detail,
      status,
      selection,
      addWorker,
      removeWorker,
      hotspot,
    };
  }

  private createGatherableVisual(gatherable: TownGatherableSnapshot) {
    const position = this.getGatherablePosition(gatherable);
    const width = this.getGatherableWidth(gatherable);
    const height = this.getGatherableHeight(gatherable);
    const asset = GATHERING_ASSETS[gatherable.resourceId];

    const shadow = this.add.ellipse(0, height * 0.34, width * 0.7, Math.max(12, height * 0.18), 0x17211f, 0.32).setDepth(3);
    const image = this.add.image(0, 0, asset.key).setDisplaySize(width, height).setDepth(6);
    const hitArea = this.add.ellipse(0, 0, width * 0.82, height * 0.78, 0xffffff, 0.001).setDepth(7);
    const badge = this.add
      .text(width * 0.3, -height * 0.33, `${gatherable.clicksRemaining}`, {
        align: 'center',
        backgroundColor: 'rgba(23, 33, 31, 0.82)',
        color: '#fff8e8',
        fixedWidth: 24,
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(8);

    const container = this.add.container(position.x, position.y, [shadow, image, hitArea, badge]).setDepth(8);
    container.setData('gatherable', gatherable);

    const emitGather = () => {
      if (this.inputLocked) {
        return;
      }

      const current = container.getData('gatherable') as TownGatherableSnapshot;
      this.showFloatingGain(container.x, container.y - height * 0.34);
      this.tweens.add({
        targets: image,
        scaleX: image.scaleX * 1.07,
        scaleY: image.scaleY * 1.07,
        duration: 80,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
      this.game.events.emit('town:gather-resource', current.resourceId);
    };

    hitArea
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_UP, emitGather)
      .on(Phaser.Input.Events.POINTER_OVER, () => image.setTint(0xfff0be))
      .on(Phaser.Input.Events.POINTER_OUT, () => image.clearTint());

    return {
      container,
      image,
      hitArea,
      shadow,
      badge,
      gatherable,
    };
  }

  private showFloatingGain(x: number, y: number) {
    const text = this.add
      .text(x, y, '+1', {
        color: '#fff8e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        stroke: '#17211f',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
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
      visual.removeWorker.setPosition(-this.getHotspotWidth(visual.hotspot) / 2 + 17, 10);
      visual.addWorker.setPosition(this.getHotspotWidth(visual.hotspot) / 2 - 17, 10);
    }

    for (const visual of this.gatherableVisuals.values()) {
      const position = this.getGatherablePosition(visual.gatherable);
      const width = this.getGatherableWidth(visual.gatherable);
      const height = this.getGatherableHeight(visual.gatherable);

      visual.container.setPosition(position.x, position.y);
      visual.image.setDisplaySize(width, height);
      visual.hitArea.setSize(width * 0.82, height * 0.78);
      visual.shadow.setSize(width * 0.7, Math.max(12, height * 0.18));
      visual.shadow.setPosition(0, height * 0.34);
      visual.badge.setPosition(width * 0.3, -height * 0.33);
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

  private getGatherablePosition(gatherable: TownGatherableSnapshot) {
    const { width, height } = this.scale;
    const backdropWidth = this.backdrop?.displayWidth ?? width;
    const backdropHeight = this.backdrop?.displayHeight ?? height;
    const left = width / 2 - backdropWidth / 2;
    const top = height / 2 - backdropHeight / 2;

    return {
      x: left + gatherable.x * backdropWidth,
      y: top + gatherable.y * backdropHeight,
    };
  }

  private getGatherableWidth(gatherable: TownGatherableSnapshot) {
    return Math.max(86, (this.backdrop?.displayWidth ?? this.scale.width) * gatherable.width);
  }

  private getGatherableHeight(gatherable: TownGatherableSnapshot) {
    return Math.max(72, (this.backdrop?.displayHeight ?? this.scale.height) * gatherable.height);
  }
}
