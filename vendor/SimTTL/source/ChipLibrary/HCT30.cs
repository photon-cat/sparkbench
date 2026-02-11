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
    /// Class definition of the logic chip 74HCT30.
    /// </summary>
    public class HCT30 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/cd74hct30.pdf

        private const double TYP_PROPAGATION_DELAY = 11;

        #region Input Pins
        public Pin A;
        public Pin B;
        public Pin C;
        public Pin D;
        public Pin E;
        public Pin F;
        public Pin G;
        public Pin H;
        #endregion Input Pins

        #region Output Pins
        public Pin Y;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT30(string Name) : this(Name, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT30(string Name, Net NetA, Net NetB, Net NetC, Net NetD, Net NetE, Net NetF, Net NetG, Net NetH) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "14");
            this.Ground[0] = new Pin(this, "GND", "7");
            this.Passive = new Pin[3];
            this.Passive[0] = new Pin(this, "13", "13");
            this.Passive[1] = new Pin(this, "10", "10");
            this.Passive[2] = new Pin(this, "9", "9");

            this.A = new Pin(this, "A",  "1", LineMode.In, SignalState.L, NetA);
            this.B = new Pin(this, "B",  "2", LineMode.In, SignalState.L, NetB);
            this.C = new Pin(this, "C",  "3", LineMode.In, SignalState.L, NetC);
            this.D = new Pin(this, "D",  "4", LineMode.In, SignalState.L, NetD);
            this.E = new Pin(this, "E",  "5", LineMode.In, SignalState.L, NetE);
            this.F = new Pin(this, "F",  "6", LineMode.In, SignalState.L, NetF);
            this.G = new Pin(this, "G", "11", LineMode.In, SignalState.L, NetG);
            this.H = new Pin(this, "H", "12", LineMode.In, SignalState.L, NetH);

            this.Y = new Pin(this, "Y",  "8", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[1][];
            SetPinArray(Inputs, 0, new Pin[] { this.A, this.B, this.C, this.D, this.E, this.F, this.G, this.H });

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, this.Y);
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

            if (A.State == SignalState.H && B.State == SignalState.H && C.State == SignalState.H && D.State == SignalState.H &&
                E.State == SignalState.H && F.State == SignalState.H && G.State == SignalState.H && H.State == SignalState.H)

                Y.NewOutState = SignalState.L;
            else
                Y.NewOutState = SignalState.H;
        }
        #endregion Public Methods
    }
}