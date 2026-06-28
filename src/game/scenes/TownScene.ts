import Phaser from 'phaser';
import townBackdropUrl from '../../assets/town/mountain-town-backdrop.png';
import type { BuildingId } from '../../simulation';

interface TownBuildingSnapshot {
  id: BuildingId;
  label: string;
  level: number;
  workers: number;
  blocked: boolean;
}

export interface TownSnapshot {
  money: number;
  food: number;
  globalProductionMultiplier: number;
  buildings: TownBuildingSnapshot[];
}

interface BuildingVisual {
  labelBackground: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Arc;
}

const TOWN_BACKDROP_KEY = 'mountain-town-backdrop';

const buildingPositions: Record<BuildingId, { x: number; y: number }> = {
  mine: { x: 0.18, y: 0.29 },
  lumberjack: { x: 0.47, y: 0.33 },
  farm: { x: 0.57, y: 0.51 },
  food_maker: { x: 0.75, y: 0.37 },
  smelter: { x: 0.29, y: 0.74 },
  blacksmith: { x: 0.69, y: 0.78 },
};

export class TownScene extends Phaser.Scene {
  private backdrop?: Phaser.GameObjects.Image;
  private visuals = new Map<BuildingId, BuildingVisual>();
  private smoke: Phaser.GameObjects.Arc[] = [];
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super('TownScene');
  }

  preload() {
    this.load.image(TOWN_BACKDROP_KEY, townBackdropUrl);
  }

  create() {
    this.drawBackdrop();
    this.createBuildings();

    this.statusText = this.add
      .text(18, 16, '', {
        color: '#173238',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
      })
      .setDepth(10);

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
    this.backdrop = this.add.image(width / 2, height / 2, TOWN_BACKDROP_KEY).setDepth(0);
    this.layoutBackdrop();
  }

  private createBuildings() {
    const { width, height } = this.scale;

    (Object.keys(buildingPositions) as BuildingId[]).forEach((buildingId) => {
      const position = this.getCanvasPosition(buildingId);
      const labelBackground = this.add
        .rectangle(position.x, position.y, 96, 42, 0x17211f, 0.72)
        .setStrokeStyle(1, 0xf8f3df, 0.38)
        .setDepth(5);
      const label = this.add
        .text(position.x, position.y, '', {
          align: 'center',
          color: '#fff8e8',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          lineSpacing: 2,
        })
        .setOrigin(0.5)
        .setDepth(6);
      const status = this.add.circle(position.x + 44, position.y - 20, 6, 0x73c66d).setDepth(7);

      this.visuals.set(buildingId, { labelBackground, label, status });
    });

    for (let index = 0; index < 7; index += 1) {
      this.smoke.push(this.add.circle(width * 0.34 + index * 5, height * 0.62 + index * 8, 7, 0xd6d2c8, 0.32));
    }
  }

  private updateTown(snapshot: TownSnapshot) {
    this.statusText?.setText(
      `Food ${snapshot.food.toFixed(1)}  ·  ${snapshot.globalProductionMultiplier < 1 ? 'Shortage' : 'Stable'}`,
    );

    for (const building of snapshot.buildings) {
      const visual = this.visuals.get(building.id);
      if (!visual) {
        continue;
      }

      visual.label.setText(`${building.label}\nLv ${building.level} · ${building.workers}`);
      visual.labelBackground.setDisplaySize(Math.max(94, visual.label.width + 18), visual.label.height + 12);
      visual.status.setFillStyle(building.blocked ? 0xd8903f : 0x73c66d);
      visual.label.setAlpha(building.workers > 0 ? 1 : 0.68);
      visual.labelBackground.setAlpha(building.workers > 0 ? 0.74 : 0.52);
    }
  }

  private layoutTown() {
    const { width, height } = this.scale;

    this.layoutBackdrop();
    this.statusText?.setPosition(18, 16);

    for (const [buildingId, visual] of this.visuals) {
      const position = this.getCanvasPosition(buildingId);
      visual.labelBackground.setPosition(position.x, position.y);
      visual.label.setPosition(position.x, position.y);
      visual.status.setPosition(position.x + 44, position.y - 20);
    }

    this.smoke.forEach((particle, index) => {
      particle.setPosition(width * 0.29 + index * 5, height * 0.62 + index * 8);
    });
  }

  private layoutBackdrop() {
    const { width, height } = this.scale;

    if (!this.backdrop) {
      return;
    }

    const scale = Math.min(width / this.backdrop.width, height / this.backdrop.height);
    this.backdrop.setPosition(width / 2, height / 2).setScale(scale);
  }

  private getCanvasPosition(buildingId: BuildingId) {
    const { width, height } = this.scale;
    const position = buildingPositions[buildingId];
    const backdropWidth = this.backdrop?.displayWidth ?? width;
    const backdropHeight = this.backdrop?.displayHeight ?? height;
    const left = width / 2 - backdropWidth / 2;
    const top = height / 2 - backdropHeight / 2;

    return {
      x: left + position.x * backdropWidth,
      y: top + position.y * backdropHeight,
    };
  }
}
