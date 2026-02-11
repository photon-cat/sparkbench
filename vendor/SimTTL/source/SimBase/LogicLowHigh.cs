// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimBase
{
    /// <summary>
    /// A class to add logic low and logic low pins to a schematics. This is used to pull element pins up or down by connecting to these pins.
    /// </summary>
    public class LogicLowHigh:BaseElement
    {
        /// <summary>A fixed pin constantly holding low level.</summary>
        public readonly Pin L;
        /// <summary>A fixed pin constantly holding high level.</summary>
        public readonly Pin H;

        /// <summary>
        /// Creates the instance of LogicLowHigh.
        /// </summary>
        public LogicLowHigh():base("LogicLowHigh")
        {
            this.Power = new Pin[0];
            this.Ground = new Pin[0];

            this.L = new Pin(this, "L", "", LineMode.Out, SignalState.L, 0);
            this.H = new Pin(this, "H", "", LineMode.Out, SignalState.H, 0);

            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, this.L);
            SetPinArray(Outputs, 1, this.H);
        }
    }
}
