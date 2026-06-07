/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';
import { CodeIcon, SaveIcon, LoadIcon, UndoIcon, RedoIcon, DocumentPlusIcon, PlayIcon, PauseIcon, StopIcon, ArrowPathIcon } from './Icons';
import { useAppContext } from '../context/AppContext';

const MenuButton: React.FC<{ onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string; }> = ({ onClick, disabled, children, className }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);


export const Header: React.FC = () => {
    const {
        playbackState,
        handlePlayPause,
        handleStop,
        handleRestart,
        isSidebarVisible,
        setIsSidebarVisible,
        handleNewSessionClick,
        handleLoadSession,
        handleSaveSession,
        handleUndo,
        historyIndex,
        handleRedo,
        history,
        fileInputRef,
        handleFileChange,
        firewallHealth,
    } = useAppContext();

    return (
        <header className="bg-gray-950/50 backdrop-blur-sm border-b border-gray-700 p-2 flex justify-between items-center z-20 flex-shrink-0">
            <div className="flex items-center gap-2 bg-gray-800 px-2 py-1 rounded-md">
                <button onClick={handlePlayPause} title={playbackState === 'playing' ? "Pause" : "Play"} className="p-1.5 rounded-md hover:bg-gray-700 transition-colors">
                    {playbackState === 'playing' ? <PauseIcon className="text-base" /> : <PlayIcon className="text-base" />}
                </button>
                <button onClick={handleStop} title="Stop & Reset Time" className="p-1.5 rounded-md hover:bg-gray-700 transition-colors">
                    <StopIcon className="text-base" />
                </button>
                <button onClick={handleRestart} title="Restart" className="p-1.5 rounded-md hover:bg-gray-700 transition-colors">
                    <ArrowPathIcon className="text-base" />
                </button>
            </div>

            {/* Shield Integrity Progress Bar */}
            <div className="flex-1 max-w-xs sm:max-w-sm mx-3 sm:mx-8">
                <div className="flex justify-between items-center mb-1 text-[10px] font-mono tracking-wider">
                    <span className="text-cyan-400 font-extrabold flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-cyan-400 animate-[pulse_2s_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                        SHIELD INTEGRITY
                    </span>
                    <span className={firewallHealth > 30 ? "text-cyan-300 font-black" : "text-red-500 font-black animate-pulse"}>
                        {firewallHealth}%
                    </span>
                </div>
                <div className="w-full bg-slate-900/80 h-2.5 rounded-full overflow-hidden border border-cyan-500/15">
                    <div 
                        className={`h-full transition-all duration-500 ${
                            firewallHealth > 65 
                                ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]' 
                                : firewallHealth > 30 
                                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                                    : 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                        }`}
                        style={{ width: `${firewallHealth}%` }}
                    ></div>
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                    <button onClick={handleNewSessionClick} className="p-2 rounded-md hover:bg-gray-700 transition-colors" title="New Session"><DocumentPlusIcon className="text-base" /></button>
                    <button onClick={handleLoadSession} className="p-2 rounded-md hover:bg-gray-700 transition-colors" title="Load Session"><LoadIcon className="text-base" /></button>
                    <button onClick={handleSaveSession} className="p-2 rounded-md hover:bg-gray-700 transition-colors" title="Save Session"><SaveIcon className="text-base" /></button>
                </div>
                
                <div className="w-px h-6 bg-gray-700 mx-1 hidden sm:block"></div>

                <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Undo"><UndoIcon className="text-base" /></button>
                <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Redo"><RedoIcon className="text-base" /></button>

                <div className="w-px h-6 bg-gray-700 mx-1"></div>

                <button
                    onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                    className="p-2 rounded-md hover:bg-gray-700 transition-colors"
                    title={isSidebarVisible ? "Hide Editor" : "Show Editor"}
                >
                    <CodeIcon className="text-base" />
                </button>
                
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".json"
                />
            </div>
        </header>
    );
};
