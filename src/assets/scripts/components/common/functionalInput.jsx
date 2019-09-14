'use strict';
/**
 * Functional Input
 *
 * @package     MHW Calculator
 * @author      Scar Wu
 * @copyright   Copyright (c) Scar Wu (http://scar.tw)
 * @link        https://github.com/scarwu/MHWCalculator
 */

// Load Libraries
import React, { useMemo } from 'react';

// Load Core Libraries
import Helper from 'core/helper';

export default function FunctionalInput(props) {
    const {iconName, placeholder, onChange} = props;

    return useMemo(() => {
        Helper.log('Component: FunctionalInput');

        return (
            <div className="mhwc-functional_input">
                <div className="mhwc-body">
                    <div className="mhwc-icon">
                        <i className={`fa fa-${props.iconName}`}></i>
                    </div>
                    <input className="mhwc-input" type="text"
                        placeholder={props.placeholder}
                        onChange={props.onChange} />
                </div>
            </div>
        );
    }, [iconName, placeholder]);
};
