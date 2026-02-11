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
    /// Class definition of the logic chip 74HCT153.
    /// </summary>
    public class HCT153:BaseElement
    {
        // Datasheet: https://www.ti.com/lit/ds/symlink/cd74hct153.pdf

        private const double TYP_PROPAGATION_DELAY = 13;

        #region Input Pins
        public Pin S0;
        public Pin S1;

        public Pin I1En;
        public Pin I1I0;
        public Pin I1I1;
        public Pin I1I2;
        public Pin I1I3;

        public Pin I2En;
        public Pin I2I0;
        public Pin I2I1;
        public Pin I2I2;
        public Pin I2I3;
        #endregion Input Pins

        #region Output Pins
        public Pin O1Y;
        public Pin O2Y;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT153(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT153(string Name, Net NetS0, Net NetS1, Net NetI1En, Net NetI1I0, Net NetI1I1, Net NetI1I2, Net NetI1I3, Net NetI2En, Net NetI2I0, Net NetI2I1, Net NetI2I2, Net NetI2I3) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "16");
            this.Ground[0] = new Pin(this, "GND", "8");

            this.S0 = new Pin(this, "S0", "14", LineMode.In, SignalState.L, NetS0);
            this.S1 = new Pin(this, "S1", "2", LineMode.In, SignalState.L, NetS1);

            this.I1En = new Pin(this, "1En", "1", LineMode.In, SignalState.L, NetI1En);
            this.I1I0 = new Pin(this, "1I0", "6", LineMode.In, SignalState.L, NetI1I0);
            this.I1I1 = new Pin(this, "1I1", "5", LineMode.In, SignalState.L, NetI1I1);
            this.I1I2 = new Pin(this, "1I2", "4", LineMode.In, SignalState.L, NetI1I2);
            this.I1I3 = new Pin(this, "1I3", "3", LineMode.In, SignalState.L, NetI1I3);

            this.I2En = new Pin(this, "2En", "15", LineMode.In, SignalState.L, NetI2En);
            this.I2I0 = new Pin(this, "2I0", "10", LineMode.In, SignalState.L, NetI2I0);
            this.I2I1 = new Pin(this, "2I1", "11", LineMode.In, SignalState.L, NetI2I1);
            this.I2I2 = new Pin(this, "2I2", "12", LineMode.In, SignalState.L, NetI2I2);
            this.I2I3 = new Pin(this, "2I3", "13", LineMode.In, SignalState.L, NetI2I3);

            this.O1Y = new Pin(this, "1Y", "7", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Y = new Pin(this, "2Y", "9", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[3][];
            SetPinArray(Inputs, 0, new Pin[] { this.S0, this.S1 });
            SetPinArray(Inputs, 1, new Pin[] { this.I1En, this.I1I0, this.I1I1, this.I1I2, this.I1I3 });
            SetPinArray(Inputs, 2, new Pin[] { this.I2En, this.I2I0, this.I2I1, this.I2I2, this.I2I3 });
   
            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, this.O1Y);
            SetPinArray(Outputs, 1, this.O2Y);
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

            if (I1En.State == SignalState.L)
            {
                if (S1.State == SignalState.L)
                {
                    if (S0.State == SignalState.L)
                        O1Y.NewOutState = I1I0.State;
                    else
                        O1Y.NewOutState = I1I1.State;
                }
                else if (S1.State == SignalState.H)
                {
                    if (S0.State == SignalState.L)
                        O1Y.NewOutState = I1I2.State;
                    else
                        O1Y.NewOutState = I1I3.State;
                }
            }
            else O1Y.NewOutState = SignalState.L;

            if (I2En.State == SignalState.L)
            {
                if (S1.State == SignalState.L)
                {
                    if (S0.State == SignalState.L)
                        O2Y.NewOutState = I2I0.State;
                    else
                        O2Y.NewOutState = I2I1.State;
                }
                else if (S1.State == SignalState.H)
                {
                    if (S0.State == SignalState.L)
                        O2Y.NewOutState = I2I2.State;
                    else
                        O2Y.NewOutState = I2I3.State;
                }
            }
            else O2Y.NewOutState = SignalState.L;

        }
        #endregion Public Methods

    }
}
