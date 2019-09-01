'use strict';
/**
 * Changelog
 *
 * @package     MHW Calculator
 * @author      Scar Wu
 * @copyright   Copyright (c) Scar Wu (http://scar.tw)
 * @link        https://github.com/scarwu/MHWCalculator
 */

// Load Libraries
import React, { useState, useEffect, useRef } from 'react';

// Load Core Libraries
import Status from 'core/status';

// Load Custom Libraries
import _ from 'libraries/lang';

// Load Components
import FunctionalIcon from 'components/common/functionalIcon';

// Load State Control
import ModalStates from 'states/modal';

// Load Markdown
import zhTW from 'files/md/langs/zhTW/changelog.md';
import jaJP from 'files/md/langs/jaJP/changelog.md';
import enUS from 'files/md/langs/enUS/changelog.md';

export default function (props) {
    const modalRef = useRef();
    const [isShow, modalToggle] = useState(ModalStates.getters.isShowChangelog());

    useEffect(() => {
        const unsubscribe = ModalStates.store.subscribe(() => {
            modalToggle(ModalStates.getters.isShowChangelog());
        });

        return () => {
            unsubscribe();
        };
    });

    /**
     * Handle Functions
     */
    let handleFastWindowClose = (event) => {
        if (modalRef.current !== event.target) {
            return;
        }

        handleWindowClose();
    };

    let handleWindowClose = () => {
        ModalStates.setters.hideChangelog();
    };

    /**
     * Render Functions
     */
    let renderChangelog = () => {
        let LogMap = {
            zhTW: zhTW,
            jaJP: jaJP,
            enUS: enUS
        };

        return LogMap[Status.get('sys:lang')];
    };

    return isShow ? (
        <div className="mhwc-selector" ref={modalRef} onClick={handleFastWindowClose}>
            <div className="mhwc-modal mhwc-slim-modal">
                <div className="mhwc-panel">
                    <strong>{_('changelog')}</strong>

                    <div className="mhwc-icons_bundle">
                        <FunctionalIcon
                            iconName="times" altName={_('close')}
                            onClick={handleWindowClose} />
                    </div>
                </div>
                <div className="mhwc-list" dangerouslySetInnerHTML={{__html: renderChangelog()}}></div>
            </div>
        </div>
    ) : false;
};
