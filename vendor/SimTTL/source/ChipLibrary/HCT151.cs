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
    /// Class definition of the logic chip 74HCT151.
    /// </summary>
    public class HCT151 : BaseElement
    {
        // Datasheet: https://www.ti.com/lit/ds/symlink/cd74hct151.pdf

        private const double TYP_PROPAGATION_DELAY = 18;

        #region Input Pins
        public Pin A;
        public Pin B;
        public Pin C;

        public Pin Gn;

        public Pin D0;
        public Pin D1;
        public Pin D2;
        public Pin D3;
        public Pin D4;
        public Pin D5;
        public Pin D6;
        public Pin D7;
        #endregion Input Pins

        #region Output Pins
        public Pin Y;
        public Pin W;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT151(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT151(string Name, Net NetA, Net NetB, Net NetC, Net NetGn, Net NetD0, Net NetD1, Net NetD2, Net NetD3, Net NetD4, Net NetD5, Net NetD6, Net NetD7) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "16");
            this.Ground[0] = new Pin(this, "GND", "8");

            this.A = new Pin(this, "A", "11", LineMode.In, SignalState.L, NetA);
            this.B = new Pin(this, "B", "10", LineMode.In, SignalState.L, NetB);
            this.C = new Pin(this, "C", "9", LineMode.In, SignalState.L,  NetB);

            this.Gn = new Pin(this, "Gn", "7", LineMode.In, SignalState.L, NetGn);
                                                                        
            this.D0 = new Pin(this, "D0", "4", LineMode.In, SignalState.L, NetD0);
            this.D1 = new Pin(this, "D1", "3", LineMode.In, SignalState.L, NetD1);
            this.D2 = new Pin(this, "D2", "2", LineMode.In, SignalState.L, NetD2);
            this.D3 = new Pin(this, "D3", "1", LineMode.In, SignalState.L, NetD3);
            this.D4 = new Pin(this, "D4", "15", LineMode.In, SignalState.L, NetD4);
            this.D5 = new Pin(this, "D5", "14", LineMode.In, SignalState.L, NetD5);
            this.D6 = new Pin(this, "D6", "13", LineMode.In, SignalState.L, NetD6);
            this.D7 = new Pin(this, "D7", "12", LineMode.In, SignalState.L, NetD7);

            this.Y = new Pin(this, "Y", "5", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.W = new Pin(this, "W", "6", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[3][];
            SetPinArray(Inputs, 0, new Pin[] { this.Gn });
            SetPinArray(Inputs, 1, new Pin[] { this.A, this.B, this.C});
            SetPinArray(Inputs, 2, new Pin[] { this.D0, this.D1, this.D2, this.D3, this.D4, this.D5, this.D6, this.D7 });

            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, this.Y);
            SetPinArray(Outputs, 1, this.W);
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

            if (Gn.State == SignalState.L)
            {
                int sel = GetValue(Inputs[1]);
                if (sel >= 0)
                {
                    Y.NewOutState = Inputs[2][sel].State;
                    W.NewOutState = Pin.InvertedState(Y.NewOutState);
                }
            }
            else
            {
                Y.NewOutState = SignalState.L;
                W.NewOutState = SignalState.H;
            }
        }
        #endregion Public Methods

    }

}

