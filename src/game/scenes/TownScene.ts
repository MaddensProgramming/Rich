import Phaser from 'phaser';
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
  base: Phaser.GameObjects.Rectangle;
  roof: Phaser.GameObjects.Triangle;
  label: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Arc;
}

export class TownScene extends Phaser.Scene {
  private visuals = new Map<BuildingId, BuildingVisual>();
  private smoke: Phaser.GameObjects.Arc[] = [];
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super('TownScene');
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
    this.add.rectangle(width / 2, height / 2, width, height, 0x8fc7c9);
    this.add.triangle(width * 0.5, height * 0.12, 0, height * 0.58, width * 0.4, 0, width * 0.8, height * 0.58, 0x5e7473);
    this.add.triangle(width * 0.28, height * 0.25, 0, height * 0.42, width * 0.34, 0, width * 0.68, height * 0.42, 0x7f8d82);
    this.add.triangle(width * 0.72, height * 0.28, 0, height * 0.36, width * 0.28, 0, width * 0.56, height * 0.36, 0x6b817c);
    this.add.rectangle(width / 2, height * 0.75, width, height * 0.5, 0x587454);
    this.add.rectangle(width / 2, height * 0.82, width, height * 0.08, 0x8c7655);

    for (let index = 0; index < 9; index += 1) {
      this.add.circle(40 + index * 72, height * 0.68 + (index % 2) * 12, 16, 0x2e5d4f);
      this.add.rectangle(40 + index * 72, height * 0.72 + (index % 2) * 12, 8, 34, 0x6f513f);
    }
  }

  private createBuildings() {
    const { width, height } = this.scale;
    const positions: Record<BuildingId, { x: number; y: number; color: number }> = {
      mine: { x: width * 0.18, y: height * 0.63, color: 0x53585b },
      lumberjack: { x: width * 0.36, y: height * 0.69, color: 0x7d5d3c },
      farm: { x: width * 0.54, y: height * 0.72, color: 0x6d8a3f },
      food_maker: { x: width * 0.72, y: height * 0.66, color: 0xa76947 },
      smelter: { x: width * 0.34, y: height * 0.83, color: 0x66534d },
      blacksmith: { x: width * 0.62, y: height * 0.84, color: 0x514c57 },
    };

    (Object.entries(positions) as [BuildingId, { x: number; y: number; color: number }][]).forEach(
      ([buildingId, position]) => {
        const base = this.add.rectangle(position.x, position.y, 92, 56, position.color).setStrokeStyle(2, 0x233137);
        const roof = this.add.triangle(
          position.x,
          position.y - 42,
          -54,
          26,
          0,
          -18,
          54,
          26,
          0x9f5640,
        );
        const label = this.add
          .text(position.x, position.y - 8, '', {
            align: 'center',
            color: '#f6f2e8',
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
        const status = this.add.circle(position.x + 38, position.y - 22, 6, 0x73c66d);

        this.visuals.set(buildingId, { base, roof, label, status });
      },
    );

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
      visual.status.setFillStyle(building.blocked ? 0xd8903f : 0x73c66d);
      visual.base.setAlpha(building.workers > 0 ? 1 : 0.72);
      visual.roof.setAlpha(building.workers > 0 ? 1 : 0.72);
    }
  }
}
