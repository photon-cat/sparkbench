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
    /// Class definition of the logic chip 74HCT20.
    /// </summary>
    public class HCT20 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/cd74hct20.pdf

        private const double TYP_PROPAGATION_DELAY = 11;

        #region Input Pins
        public Pin I1A;
        public Pin I1B;
        public Pin I1C;
        public Pin I1D;
        public Pin I2A;
        public Pin I2B;
        public Pin I2C;
        public Pin I2D;
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
        public HCT20(string Name) : this(Name, null, null, null, null, null, null, null, null) { }
 
        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT20(string Name, Net NetI1A, Net NetI1B, Net NetI1C, Net NetI1D, Net NetI2A, Net NetI2B, Net NetI2C, Net NetI2D) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "14");
            this.Ground[0] = new Pin(this, "GND", "7");

            this.I1A = new Pin(this, "1A",  "1", LineMode.In, SignalState.L, NetI1A);
            this.I1B = new Pin(this, "1B",  "2", LineMode.In, SignalState.L, NetI1B);
            this.I1C = new Pin(this, "1C",  "4", LineMode.In, SignalState.L, NetI1C);
            this.I1D = new Pin(this, "1D",  "5", LineMode.In, SignalState.L, NetI1D);
            this.I2A = new Pin(this, "2A", "13", LineMode.In, SignalState.L, NetI2A);
            this.I2B = new Pin(this, "2B", "12", LineMode.In, SignalState.L, NetI2B);
            this.I2C = new Pin(this, "2C", "10", LineMode.In, SignalState.L, NetI2C);
            this.I2D = new Pin(this, "2C",  "9", LineMode.In, SignalState.L, NetI2D);

            this.O1Y = new Pin(this, "1Y",  "6", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Y = new Pin(this, "2Y",  "8", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[2][];
            SetPinArray(Inputs, 0, new Pin[] { this.I1A, this.I1B, this.I1C, this.I1D });
            SetPinArray(Inputs, 1, new Pin[] { this.I2A, this.I2B, this.I2C, this.I2D });

            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, this.O1Y);
            SetPinArray(Outputs, 1, this.O2Y);
        }
        #endregion Constructors

        #region Private Methods
        /// <summary>
        /// Implement the NAND function.
        /// </summary>
        /// <param name="InA">Input Pin A to check.</param>
        /// <param name="InB">Input Pin B to check.</param>
        /// <param name="OutY">Output pin to set.</param>
        private void Nand(Pin InA, Pin InB, Pin InC, Pin InD, Pin OutY)
        {
            if (InA.State == SignalState.H && InB.State == SignalState.H && InC.State == SignalState.H && InD.State == SignalState.H)
                OutY.NewOutState = SignalState.L;
            else
                OutY.NewOutState = SignalState.H;
        }

        #endregion Private Methods

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            Nand(I1A, I1B, I1C, I1D, O1Y);
            Nand(I2A, I2B, I2C, I2D, O2Y);
        }
        #endregion Public Methods

    }
}
