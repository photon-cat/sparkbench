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
    /// Class definition of the logic chip 74HCT157.
    /// </summary>
    public class HCT157 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/sn74hct157.pdf

        private const double TYP_PROPAGATION_DELAY = 15;

        #region Input Pins
        public Pin S;
        public Pin En;

        public Pin I1A;
        public Pin I1B;
        public Pin I2A;
        public Pin I2B;
        public Pin I3A;
        public Pin I3B;
        public Pin I4A;
        public Pin I4B;
        #endregion Input Pins

        #region Output Pins
        public Pin O1Y;
        public Pin O2Y;
        public Pin O3Y;
        public Pin O4Y;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT157(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT157(string Name, Net NetS, Net NetEn, Net NetI1A, Net NetI1B, Net NetI2A, Net NetI2B, Net NetI3A, Net NetI3B, Net NetI4A, Net NetI4B) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "16");
            this.Ground[0] = new Pin(this, "GND", "8");

            this.S = new Pin(this,  "S",   "1", LineMode.In, SignalState.L, NetS);
            this.En = new Pin(this, "En", "15", LineMode.In, SignalState.L, NetEn);

            this.I1A = new Pin(this, "1A", "2", LineMode.In, SignalState.L, NetI1A);
            this.I1B = new Pin(this, "1B", "3", LineMode.In, SignalState.L, NetI1B);
            this.I2A = new Pin(this, "2A", "5", LineMode.In, SignalState.L, NetI2A);
            this.I2B = new Pin(this, "2B", "6", LineMode.In, SignalState.L, NetI2B);
            this.I3A = new Pin(this, "3A", "11", LineMode.In, SignalState.L, NetI3A);
            this.I3B = new Pin(this, "3B", "10", LineMode.In, SignalState.L, NetI3B);
            this.I4A = new Pin(this, "4A", "14", LineMode.In, SignalState.L, NetI4A);
            this.I4B = new Pin(this, "4B", "13", LineMode.In, SignalState.L, NetI4B);

            this.O1Y = new Pin(this, "1Y",  "4", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Y = new Pin(this, "2Y",  "7", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O3Y = new Pin(this, "3Y",  "9", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O4Y = new Pin(this, "4Y", "12", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[3][];
            SetPinArray(Inputs, 0, new Pin[] { this.S, this.En });
            SetPinArray(Inputs, 1, new Pin[] { this.I1A, this.I2A, this.I3A, this.I4A });
            SetPinArray(Inputs, 2, new Pin[] { this.I1B, this.I2B, this.I3B, this.I4B });

            Outputs = new Pin[4][];
            SetPinArray(Outputs, 0, this.O1Y);
            SetPinArray(Outputs, 1, this.O2Y);
            SetPinArray(Outputs, 2, this.O3Y);
            SetPinArray(Outputs, 3, this.O4Y);
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

            if (En.State == SignalState.L)
            {
                if (S.State == SignalState.L)
                {
                    O1Y.NewOutState = I1A.State;
                    O2Y.NewOutState = I2A.State;
                    O3Y.NewOutState = I3A.State;
                    O4Y.NewOutState = I4A.State;
                }
                else if (S.State == SignalState.H)
                {
                    O1Y.NewOutState = I1B.State;
                    O2Y.NewOutState = I2B.State;
                    O3Y.NewOutState = I3B.State;
                    O4Y.NewOutState = I4B.State;
                }
            }
            else
            {
                O1Y.NewOutState = SignalState.L;
                O2Y.NewOutState = SignalState.L;
                O3Y.NewOutState = SignalState.L;
                O4Y.NewOutState = SignalState.L;
            }
        }
        #endregion Public Methods

    }
}
