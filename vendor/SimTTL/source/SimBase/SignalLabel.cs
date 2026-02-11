// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define DEBUG_WRITE

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;

namespace SimBase
{
    /// <summary>
    /// Class to hold a signal label.
    /// </summary>
    public class SignalLabel : BaseElement
    {
        /// <summary>Reference to the input.</summary>
        public Pin Pin;

        /// <summary>
        /// Creates the SignalLabel instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="Net">Connected net.</param>
        public SignalLabel(string Name) : base("")
        {
            this.Name = Name;

            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];
            Inputs = new Pin[1][];
            SetPinArray(Inputs, 0, new Pin(this, "", "", LineMode.In, SignalState.Z, null));
            this.Pin = Inputs[0][0];
        }

        /// <summary>
        /// Creates the SignalLabel instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="Net">Connected net.</param>
        public SignalLabel(string Name, Net Net) : base("")
        {
            this.Name = Name;

            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];
            Inputs = new Pin[1][];
            SetPinArray(Inputs, 0, new Pin(this, "", "", LineMode.In, SignalState.Z, Net));
            this.Pin = Inputs[0][0];
        }

        public Net Net
        {
            get { return Pin.ConnectedNet; }
            set { Pin.ConnectedNet = value; }
        }
    }
}
