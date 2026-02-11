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

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT541.
    /// </summary>
    public class HCT541 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/sn74hct541.pdf

        private const double TYP_PROPAGATION_DELAY = 12;

        #region Input Pins
        public Pin OE1n;
        public Pin OE2n;

        public Pin A1;
        public Pin A2;
        public Pin A3;
        public Pin A4;
        public Pin A5;
        public Pin A6;
        public Pin A7;
        public Pin A8;
        #endregion Input Pins

        #region Output Pins
        public Pin Y1;
        public Pin Y2;
        public Pin Y3;
        public Pin Y4;
        public Pin Y5;
        public Pin Y6;
        public Pin Y7;
        public Pin Y8;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT541(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT541(string Name, Net NetOE1n, Net NetOE2n, Net NetA1, Net NetA2, Net NetA3, Net NetA4, Net NetA5, Net NetA6, Net NetA7, Net NetA8) : base(Name)
        {
            this.Power[0] =  new Pin(this, "VCC", "20");
            this.Ground[0] = new Pin(this, "GND", "10");

            this.OE1n = new Pin(this, "OE1n", "1", LineMode.In, SignalState.L, NetOE1n);
            this.OE2n = new Pin(this, "OE2n", "19", LineMode.In, SignalState.L, NetOE2n);

            this.A1 = new Pin(this, "A1", "2", LineMode.In, SignalState.L, NetA1);
            this.A2 = new Pin(this, "A2", "3", LineMode.In, SignalState.L, NetA2);
            this.A3 = new Pin(this, "A3", "4", LineMode.In, SignalState.L, NetA3);
            this.A4 = new Pin(this, "A4", "5", LineMode.In, SignalState.L, NetA4);
            this.A5 = new Pin(this, "A5", "6", LineMode.In, SignalState.L, NetA5);
            this.A6 = new Pin(this, "A6", "7", LineMode.In, SignalState.L, NetA6);
            this.A7 = new Pin(this, "A7", "8", LineMode.In, SignalState.L, NetA7);
            this.A8 = new Pin(this, "A8", "9", LineMode.In, SignalState.L, NetA8);

            this.Y1 = new Pin(this, "Y1", "18", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Y2 = new Pin(this, "Y2", "17", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Y3 = new Pin(this, "Y3", "16", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Y4 = new Pin(this, "Y4", "15", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Y5 = new Pin(this, "Y5", "14", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Y6 = new Pin(this, "Y6", "13", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Y7 = new Pin(this, "Y7", "12", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Y8 = new Pin(this, "Y8", "11", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[2][];
            SetPinArray(Inputs, 0, new Pin[] { this.OE1n, this.OE2n });
            SetPinArray(Inputs, 1, new Pin[] { this.A1, this.A2, this.A3, this.A4, this.A5, this.A6, this.A7, this.A8 });

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, new Pin[] { this.Y1, this.Y2, this.Y3, this.Y4, this.Y5, this.Y6, this.Y7, this.Y8 });

            SimulationRestart();
        }
        #endregion Constructors

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

            if ((OE1n.State == SignalState.L) && (OE2n.State == SignalState.L))
            {
                Y1.NewOutState = A1.State;
                Y2.NewOutState = A2.State;
                Y3.NewOutState = A3.State;
                Y4.NewOutState = A4.State;
                Y5.NewOutState = A5.State;
                Y6.NewOutState = A6.State;
                Y7.NewOutState = A7.State;
                Y8.NewOutState = A8.State;
            }
            else
            {
                Y1.NewOutState = SignalState.Z;
                Y2.NewOutState = SignalState.Z;
                Y3.NewOutState = SignalState.Z;
                Y4.NewOutState = SignalState.Z;
                Y5.NewOutState = SignalState.Z;
                Y6.NewOutState = SignalState.Z;
                Y7.NewOutState = SignalState.Z;
                Y8.NewOutState = SignalState.Z;
            }
        }
        #endregion Public Methods
    }
}
