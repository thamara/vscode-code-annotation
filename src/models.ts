import * as vscode from 'vscode';

export interface Position {
    line: number;
    character: number;
}

export interface SuccessResponse {
    success: boolean
}

export interface Term {
    fileName: string;
    fileLine: number;
    positionStart: Position;
    positionEnd: Position;
    text: string;
    codeSnippet: string;
    status: 'pending' | 'done';
    id: number;
    interpretation: Interpretation | null;
    error : string | null;
    node_type: string;
}

export interface Constructor {
    id: number;
    name: string;
    interpretation: Interpretation | null;
    node_type: string;
    status: 'pending' | 'done';
}

export interface MeasurementSystem extends vscode.QuickPickItem{
    label: string;
}

export interface Space extends vscode.QuickPickItem {

}

export interface TimeCoordinateSpace extends Space {
    label: string; // interpX
    space: string; // Always "Classical Time Coordinate Space"
    parent: TimeCoordinateSpace | null;
    origin: number[] | null;
    basis: number[] | null;
}

export interface Geom1DCoordinateSpace extends Space {
    label: string; // interpX
    space: string; // Always "Classical Time Coordinate Space"
    parent: Geom1DCoordinateSpace | null;
    origin: number[] | null;
    basis: number[] | null;
}

export interface Geom3DCoordinateSpace extends Space {
    label: string; // interpX
    space: string; // Always "Classical Time Coordinate Space"
    parent: Geom3DCoordinateSpace | null;
    origin: number[] | null;
    basis: number[] | null;
}


export interface Interpretation extends vscode.QuickPickItem {
    label: string;
    name: string;
    interp_type: string;
    node_type: string;
}

export interface Duration extends Interpretation {
    value: number[];
    space: TimeCoordinateSpace;
}
export interface Time extends Interpretation {
    value: number[];
    space: TimeCoordinateSpace;
}
export interface Scalar extends Interpretation {
    value: number[];
}
export interface TimeTransform extends Interpretation {
    domain: TimeCoordinateSpace;
    codomain: TimeCoordinateSpace;
}
export interface Displacement1D extends Interpretation {
    value: number[];
    space: Geom1DCoordinateSpace;
}
export interface Position1D extends Interpretation {
    value: number[];
    space: Geom1DCoordinateSpace;
}
export interface Geom1DTransform extends Interpretation {
    domain: Geom1DCoordinateSpace;
    codomain: Geom1DCoordinateSpace;
}

export interface Displacement3D extends Interpretation {
    value: number[];
    space: Geom3DCoordinateSpace;
}
export interface Position3D extends Interpretation {
    value: number[];
    space: Geom3DCoordinateSpace;
}
export interface Geom3DTransform extends Interpretation {
    domain: Geom3DCoordinateSpace;
    codomain: Geom3DCoordinateSpace;
}

export interface PeirceDb {
    terms: Term[];
    constructors: Constructor[]
    time_coordinate_spaces: TimeCoordinateSpace[];
    geom1d_coordinate_spaces: Geom1DCoordinateSpace[];
    geom3d_coordinate_spaces: Geom3DCoordinateSpace[];
    nextId: number;
}