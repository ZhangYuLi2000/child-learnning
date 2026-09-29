import {
  CircleGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
} from 'three';

/**
 * 固定的卡通环境：草地、树、石头、花、云。
 * 环境永远不旋转，用来帮助孩子理解“世界没有转，是动物转了”。
 */
export class Environment {
  readonly root = new Group();

  constructor() {
    this.root.name = 'Environment';
    this.buildGround();
    this.buildTrees();
    this.buildRocks();
    this.buildFlowers();
    this.buildClouds();
  }

  private buildGround(): void {
    const grass = new Mesh(new CircleGeometry(30, 64), new MeshLambertMaterial({ color: '#8fd16a' }));
    grass.rotation.x = -Math.PI / 2;
    this.root.add(grass);

    const lawn = new Mesh(new CircleGeometry(4.2, 64), new MeshLambertMaterial({ color: '#a6df7f' }));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = 0.005;
    this.root.add(lawn);
  }

  private buildTrees(): void {
    const trunkGeometry = new CylinderGeometry(0.18, 0.25, 1, 12);
    const crownGeometry = new SphereGeometry(0.9, 20, 16);
    const trunkMaterial = new MeshLambertMaterial({ color: '#a0673a' });
    const crownMaterial = new MeshLambertMaterial({ color: '#4caf50' });
    const crownLight = new MeshLambertMaterial({ color: '#66c46a' });

    const spots: Array<[number, number, number]> = [
      [-5.6, -4.2, 1.1],
      [5.8, -3.6, 1],
      [-6.4, 2.6, 0.9],
      [6.6, 2.2, 1.15],
      [0.6, -7.5, 1.2],
    ];
    spots.forEach(([x, z, s], i) => {
      const tree = new Group();
      const trunk = new Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 0.5;
      const crown = new Mesh(crownGeometry, i % 2 === 0 ? crownMaterial : crownLight);
      crown.position.y = 1.55;
      tree.add(trunk, crown);
      tree.position.set(x, 0, z);
      tree.scale.setScalar(s);
      this.root.add(tree);
    });
  }

  private buildRocks(): void {
    const geometry = new DodecahedronGeometry(0.4, 0);
    const material = new MeshLambertMaterial({ color: '#b0b7c3', flatShading: true });
    const spots: Array<[number, number, number]> = [
      [-4.6, 4.4, 1],
      [4.9, 4.8, 0.8],
      [-3.4, -5.6, 0.7],
    ];
    for (const [x, z, s] of spots) {
      const rock = new Mesh(geometry, material);
      rock.position.set(x, 0.2 * s, z);
      rock.scale.set(s * 1.3, s, s);
      this.root.add(rock);
    }
  }

  private buildFlowers(): void {
    const stemGeometry = new CylinderGeometry(0.03, 0.03, 0.3, 6);
    const headGeometry = new SphereGeometry(0.12, 10, 8);
    const stemMaterial = new MeshLambertMaterial({ color: '#3f9a3f' });
    const colors = ['#ff7eb6', '#ffd23f', '#ffffff', '#ff9f43'].map((c) => new MeshLambertMaterial({ color: c }));
    const spots: Array<[number, number]> = [
      [-5, -1.2],
      [5.2, -0.6],
      [-2.4, 5.2],
      [2.8, 5.6],
      [3.6, -5.8],
      [-6.8, -1.8],
    ];
    spots.forEach(([x, z], i) => {
      const stem = new Mesh(stemGeometry, stemMaterial);
      stem.position.set(x, 0.15, z);
      const head = new Mesh(headGeometry, colors[i % colors.length]);
      head.position.set(x, 0.33, z);
      this.root.add(stem, head);
    });
  }

  private buildClouds(): void {
    const geometry = new SphereGeometry(0.8, 16, 12);
    const material = new MeshLambertMaterial({ color: '#ffffff' });
    const spots: Array<[number, number, number]> = [
      [-7, 5, -9],
      [4, 5.5, -11],
      [10, 4.5, -6],
    ];
    for (const [x, y, z] of spots) {
      const cloud = new Group();
      const parts: Array<[number, number, number, number]> = [
        [0, 0, 0, 1],
        [0.9, -0.1, 0.1, 0.8],
        [-0.9, -0.15, 0, 0.75],
        [0.3, 0.4, 0, 0.7],
      ];
      for (const [px, py, pz, s] of parts) {
        const puff = new Mesh(geometry, material);
        puff.position.set(px, py, pz);
        puff.scale.setScalar(s);
        cloud.add(puff);
      }
      cloud.position.set(x, y, z);
      this.root.add(cloud);
    }
  }
}
